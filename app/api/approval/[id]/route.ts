import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseReviewFeedback, serializeReviewFeedback } from "@/lib/review-utils"

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

    const validToken = extractTokenFromApprovalLink(task.approval_link) === token

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
        linkDrive: task.drive_link ?? "",
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
    const body = (await request.json()) as {
      action?: "approve" | "revision"
      items?: Array<{ id?: string; timestamp?: number; note?: string; completed?: boolean }>
    }

    if (!id || !token || (body.action !== "approve" && body.action !== "revision")) {
      return NextResponse.json({ error: "Solicitação de aprovação inválida." }, { status: 400 })
    }

    const rateKey = extractClientKey(request, id)
    if (!consumeApprovalRateLimit(rateKey)) {
      return NextResponse.json({ error: "Muitas tentativas em pouco tempo." }, { status: 429 })
    }

    const supabase = getSupabaseAdmin()
    const { data: currentTask, error: loadError } = await supabase
      .from("board_cards")
      .select("id,client_feedback,approval_link")
      .eq("id", id)
      .maybeSingle()

    if (loadError || !currentTask) {
      return NextResponse.json({ error: "Este link não está mais disponível." }, { status: 404 })
    }

    if (extractTokenFromApprovalLink(currentTask.approval_link) !== token) {
      return NextResponse.json({ error: "Este link não está mais disponível." }, { status: 404 })
    }

    const existingFeedback = parseReviewFeedback(currentTask.client_feedback)
    const items =
      body.action === "revision"
        ? (body.items ?? [])
            .filter((item) => typeof item.timestamp === "number" && typeof item.note === "string" && item.note.trim())
            .map((item, index) => ({
              id: item.id?.trim() || `revision-${index + 1}`,
              timestamp: Number(item.timestamp),
              note: item.note?.trim() ?? "",
              completed: Boolean(item.completed),
            }))
        : existingFeedback.revisionItems

    if (body.action === "revision" && items.length === 0) {
      return NextResponse.json({ error: "Adicione pelo menos um comentário na timeline." }, { status: 400 })
    }

    const status = body.action === "approve" ? "concluido" : "refazendo"
    const serializedFeedback = serializeReviewFeedback({
      priceUsd: existingFeedback.priceUsd,
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

    return NextResponse.json({ success: true, status, review: parseReviewFeedback(serializedFeedback) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível enviar a resposta da aprovação."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
