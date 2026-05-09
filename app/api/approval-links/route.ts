import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { createReviewExpiry, createReviewToken } from "@/lib/review-token"
import { serializeReviewFeedback } from "@/lib/review-utils"

export const runtime = "nodejs"
type RateBucket = { count: number; resetAt: number }
const approvalLinkRateLimitStore = new Map<string, RateBucket>()

type ApprovalLinkBody = {
  taskId?: string
  driveLink?: string
  priceUsd?: number | null
  pixKey?: string
  googleDriveFileId?: string
  googleDriveFileName?: string
}

const approvalLinkSchema = z.object({
  taskId: z.string().uuid(),
  driveLink: z.string().trim().max(500).optional().default(""),
  priceUsd: z.number().nonnegative().max(1_000_000).nullable().optional(),
  pixKey: z.string().trim().max(200).optional(),
  googleDriveFileId: z.string().trim().optional(),
  googleDriveFileName: z.string().trim().max(200).optional(),
})

const getSupabaseAdmin = () => {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não está configurado.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const normalizeSupabaseUrl = (value?: string) => {
  if (!value) return undefined

  try {
    const url = new URL(value.trim().replace(/^['"]|['"]$/g, ""))
    return url.origin
  } catch {
    return value
  }
}

const requireApprovalUser = async (request: NextRequest) => {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Não autenticado.")
  }

  const token = authorization.slice("Bearer ".length).trim()
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    throw new Error("Não autenticado.")
  }

  return { supabase, user: data.user }
}

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin
  } catch {
    return ""
  }
}

const ensureTrustedOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const candidateOrigin = origin ? normalizeOrigin(origin) : referer ? normalizeOrigin(referer) : ""

  if (!candidateOrigin) {
    return NextResponse.json({ error: "Origem da requisição não pôde ser validada." }, { status: 403 })
  }

  if (candidateOrigin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 })
  }

  return null
}

const enforceRateLimit = (request: NextRequest, scope: string, max = 40) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const key = `${scope}:${forwardedFor || request.headers.get("x-real-ip") || "unknown"}`
  const now = Date.now()
  const current = approvalLinkRateLimitStore.get(key)

  if (!current || now > current.resetAt) {
    approvalLinkRateLimitStore.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return null
  }

  if (current.count >= max) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em alguns minutos." }, { status: 429 })
  }

  current.count += 1
  approvalLinkRateLimitStore.set(key, current)
  return null
}

const isSafeHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:")
  } catch {
    return false
  }
}

const sanitizeOptionalPlainText = (value: string | null | undefined) =>
  value ? value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim() : ""

const isMissingApprovalLinksTable = (message?: string | null) =>
  typeof message === "string" &&
  (message.includes("approval_links") &&
    (message.includes("schema cache") || message.includes("Could not find the table") || message.includes("does not exist")))

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, "approval-links:post", 40)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireApprovalUser(request)
    const body = approvalLinkSchema.parse((await request.json()) as ApprovalLinkBody)
    const taskId = body.taskId.trim()
    const manualDriveLink = body.driveLink.trim()
    const googleDriveFileId = body.googleDriveFileId?.trim() ?? ""

    if (!manualDriveLink && !googleDriveFileId) {
      return NextResponse.json({ error: "Selecione um vídeo do Drive ou informe um link manual." }, { status: 400 })
    }

    if (manualDriveLink && !isSafeHttpUrl(manualDriveLink)) {
      return NextResponse.json({ error: "Link do vídeo inválido." }, { status: 400 })
    }

    const reviewToken = createReviewToken()
    const approvalUrl = `${request.nextUrl.origin}/aprovacao/${taskId}?token=${reviewToken}`
    const safePrice = typeof body.priceUsd === "number" && Number.isFinite(body.priceUsd) ? body.priceUsd : null
    const safePixKey = sanitizeOptionalPlainText(body.pixKey)
    const expiresAt = createReviewExpiry(24)
    let driveLink = manualDriveLink
    let permissionId = ""
    let fileName = body.googleDriveFileName?.trim() || "Vídeo"
    let sourceType = "manual"

    if (googleDriveFileId) {
      const { createDrivePublicPermission } = await import("@/lib/google-drive")
      const drivePermission = await createDrivePublicPermission(user.id, googleDriveFileId)
      driveLink = drivePermission.webViewLink
      permissionId = drivePermission.permissionId
      fileName = drivePermission.fileName || fileName
      sourceType = "google-drive"
    }

    const { data, error } = await supabase
      .from("board_cards")
      .update({
        drive_link: driveLink,
        approval_link: approvalUrl,
        column_id: "waiting-response",
        client_status: "pendente",
        notification_read: true,
        client_feedback: serializeReviewFeedback({
          priceUsd: safePrice,
          pixKey: safePixKey,
          revisionItems: [],
        }),
      })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select("id,approval_link")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: "Não foi possível gerar o link de aprovação." }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Tarefa não encontrada ou sem permissão." }, { status: 404 })
    }

    const { error: approvalInsertError } = await supabase.from("approval_links").insert({
      user_id: user.id,
      task_id: taskId,
      token: reviewToken,
      file_id: googleDriveFileId || null,
      file_name: fileName,
      file_url: driveLink,
      permission_id: permissionId || null,
      source_type: sourceType,
      expires_at: expiresAt,
      status: "active",
    })

    if (approvalInsertError) {
      if (isMissingApprovalLinksTable(approvalInsertError.message)) {
        return NextResponse.json({ approvalLink: data.approval_link, driveLink })
      }
      return NextResponse.json({ error: "Não foi possível registrar o link de aprovação." }, { status: 400 })
    }

    return NextResponse.json({ approvalLink: data.approval_link, driveLink })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Não foi possível gerar o link de aprovação." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Não foi possível gerar o link de aprovação."
    return NextResponse.json({ error: message === "Não autenticado." ? message : "Não foi possível gerar o link de aprovação." }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
