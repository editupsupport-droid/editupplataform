import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { parseReviewFeedback, serializeReviewFeedback } from "@/lib/review-utils"
import { deleteDrivePermission } from "@/lib/google-drive"
import { sanitizePlainText } from "@/lib/security"

export const runtime = "nodejs"

type RateBucket = { count: number; resetAt: number }

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 40
const approvalRateLimit = new Map<string, RateBucket>()

const consumeApprovalRateLimit = (key: string) => {
  const now = Date.now()
  const current = approvalRateLimit.get(key)

  if (!current || now > current.resetAt) {
    approvalRateLimit.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  if (current.count >= RATE_MAX) {
    return false
  }

  current.count += 1
  approvalRateLimit.set(key, current)
  return true
}

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não está configurado.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const extractClientKey = (request: NextRequest, taskId: string) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown"
  return `${ip}:${taskId}`
}

const extractTokenFromApprovalLink = (approvalLink: string | null | undefined) => {
  if (!approvalLink) return ""

  try {
    const url = new URL(approvalLink)
    return url.searchParams.get("token")?.trim() ?? ""
  } catch {
    return ""
  }
}

const isMissingApprovalLinksTable = (message?: string | null) =>
  typeof message === "string" &&
  (message.includes("approval_links") &&
    (message.includes("schema cache") || message.includes("Could not find the table") || message.includes("does not exist")))

const approvalResponseSchema = z.object({
  action: z.enum(["approve", "revision"]),
  items: z
    .array(z.object({
      id: z.string().trim().max(80).optional(),
      timestamp: z.number().min(0).max(24 * 60 * 60).optional(),
      note: z.string().trim().max(800).optional(),
      completed: z.boolean().optional(),
    }))
    .max(80)
    .optional(),
})

const getActiveApprovalRecord = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  taskId: string,
  token: string,
  nowIso: string
) => {
  const lookup = await supabase
    .from("approval_links")
    .select("id,user_id,file_url,file_name,file_id,permission_id,source_type,status,expires_at")
    .eq("task_id", taskId)
    .eq("token", token)
    .order("created_at", { ascending: false })
    .maybeSingle()

  if (lookup.error) {
    if (isMissingApprovalLinksTable(lookup.error.message)) {
      return { lookup: null, active: null, unavailable: false }
    }
    throw new Error(lookup.error.message)
  }

  const activeLookup = await supabase
    .from("approval_links")
    .select("id,user_id,file_url,file_name,file_id,permission_id,source_type,status,expires_at")
    .eq("id", lookup.data?.id ?? "")
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .maybeSingle()

  if (activeLookup.error) {
    if (isMissingApprovalLinksTable(activeLookup.error.message)) {
      return { lookup: null, active: null, unavailable: false }
    }
    throw new Error(activeLookup.error.message)
  }

  return { lookup: lookup.data ?? null, active: activeLookup.data ?? null, unavailable: Boolean(lookup.data && !activeLookup.data) }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const token = request.nextUrl.searchParams.get("token")?.trim() ?? ""

    if (!id || !token) {
      return NextResponse.json({ available: false }, { status: 404 })
    }

    const rateKey = extractClientKey(request, id)
    if (!consumeApprovalRateLimit(rateKey)) {
      return NextResponse.json({ error: "Muitas tentativas em pouco tempo." }, { status: 429 })
    }

    const supabase = getSupabaseAdmin()
    const nowIso = new Date().toISOString()
    const approvalState = await getActiveApprovalRecord(supabase, id, token, nowIso)
    const approvalLookup = approvalState.lookup
    const approvalRecord = approvalState.active

    const { data: task, error } = await supabase
      .from("board_cards")
      .select(
        "id,user_id,title,description,client_name,drive_link,client_status,client_feedback,approval_link"
      )
      .eq("id", id)
      .maybeSingle()

    if (error || !task) {
      return NextResponse.json({ available: false }, { status: 404 })
    }

    const validToken =
      approvalLookup
        ? Boolean(approvalRecord)
        : extractTokenFromApprovalLink(task.approval_link) === token

    if (!validToken || (task.client_status && task.client_status !== "pendente")) {
      return NextResponse.json({ available: false }, { status: 404 })
    }

    let editor: Record<string, unknown> | null = null

    if (task.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,professional_title,bio,location,slug,contact_method,contact_value")
        .eq("id", task.user_id)
        .maybeSingle()
      editor = profile ?? null
    }

    return NextResponse.json({
      available: true,
      task: {
        id: task.id,
        titulo: task.title,
        descricao: task.description ?? "",
        clienteNome: task.client_name ?? "",
        linkDrive: approvalRecord?.file_url || task.drive_link || "",
        statusCliente: task.client_status ?? "pendente",
      },
      review: parseReviewFeedback(task.client_feedback),
      editor,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar a solicitação de aprovação."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const token = request.nextUrl.searchParams.get("token")?.trim() ?? ""
    const body = approvalResponseSchema.parse(await request.json())

    if (!id || !token) {
      return NextResponse.json({ error: "Solicitação de aprovação inválida." }, { status: 400 })
    }

    const rateKey = extractClientKey(request, id)
    if (!consumeApprovalRateLimit(rateKey)) {
      return NextResponse.json({ error: "Muitas tentativas em pouco tempo." }, { status: 429 })
    }

    const supabase = getSupabaseAdmin()
    const nowIso = new Date().toISOString()
    const approvalState = await getActiveApprovalRecord(supabase, id, token, nowIso)
    const approvalLookup = approvalState.lookup
    const approvalRecord = approvalState.active

    const { data: currentTask, error: loadError } = await supabase
      .from("board_cards")
      .select("id,client_feedback,approval_link")
      .eq("id", id)
      .maybeSingle()

    if (loadError || !currentTask) {
      return NextResponse.json({ error: "Este link não está mais disponível." }, { status: 404 })
    }

    if ((approvalLookup && !approvalRecord) || (!approvalLookup && extractTokenFromApprovalLink(currentTask.approval_link) !== token)) {
      return NextResponse.json({ error: "Este link não está mais disponível." }, { status: 404 })
    }

    const existingFeedback = parseReviewFeedback(currentTask.client_feedback)
    const items =
      body.action === "revision"
        ? (body.items ?? [])
            .filter((item) => typeof item.timestamp === "number" && typeof item.note === "string" && item.note.trim())
            .map((item, index) => ({
              id: sanitizePlainText(item.id || "") || `revision-${index + 1}`,
              timestamp: Number(item.timestamp),
              note: sanitizePlainText(item.note ?? ""),
              completed: Boolean(item.completed),
            }))
        : existingFeedback.revisionItems

    if (body.action === "revision" && items.length === 0) {
      return NextResponse.json({ error: "Adicione pelo menos um comentário na timeline." }, { status: 400 })
    }

    const status = body.action === "approve" ? "concluido" : "desaprovado"
    const serializedFeedback = serializeReviewFeedback({
      priceUsd: existingFeedback.priceUsd,
      pixKey: existingFeedback.pixKey,
      revisionItems: items,
    })

    const { data: rows, error: updateError } = await supabase
      .from("board_cards")
      .update({
        approved: body.action === "approve",
        client_status: status,
        column_id: status,
        client_feedback: serializedFeedback,
        approval_link: null,
        notification_read: false,
      })
      .eq("id", id)
      .not("approval_link", "is", null)
      .select("id")

    if (updateError) {
      return NextResponse.json({ error: "Não foi possível salvar a resposta." }, { status: 500 })
    }

    if (!rows?.length) {
      return NextResponse.json({ error: "Este link não está mais disponível." }, { status: 404 })
    }

    if (approvalRecord?.id) {
      await supabase
        .from("approval_links")
        .update({
          status: body.action === "approve" ? "approved" : "revision-requested",
        })
        .eq("id", approvalRecord.id)
    }

    if (
      approvalRecord?.source_type === "google-drive" &&
      approvalRecord.file_id &&
      approvalRecord.permission_id &&
      approvalRecord.user_id
    ) {
      await deleteDrivePermission(approvalRecord.user_id, approvalRecord.file_id, approvalRecord.permission_id).catch(
        () => undefined
      )
    }

    return NextResponse.json({ success: true, status, review: parseReviewFeedback(serializedFeedback) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Solicitação de aprovação inválida." }, { status: 400 })
    }
    return NextResponse.json({ error: "Não foi possível enviar a resposta da aprovação." }, { status: 500 })
  }
}
