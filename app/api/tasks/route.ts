import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthenticatedUser, requireOwnedResource } from "@/lib/supabase-server"
import { enforceRateLimit, ensureTrustedOrigin, isSafeHttpUrl, sanitizeOptionalPlainText } from "@/lib/security"

export const runtime = "nodejs"
const taskColumns =
  "id,user_id,title,description,client_id,client_name,due_date,column_id,drive_link,approval_link,approved,client_feedback,client_status,notification_read,created_at,updated_at"

const allowedTaskFields = new Set([
  "title",
  "description",
  "client_id",
  "client_name",
  "due_date",
  "column_id",
  "drive_link",
  "approval_link",
  "approved",
  "client_feedback",
  "client_status",
  "notification_read",
])

const taskChangesSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(3000).optional(),
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().trim().max(160).optional(),
  due_date: z.string().trim().max(40).nullable().optional(),
  column_id: z.string().trim().min(1).max(80).optional(),
  drive_link: z.string().trim().max(500).optional(),
  approval_link: z.string().trim().max(500).nullable().optional(),
  approved: z.boolean().optional(),
  client_feedback: z.string().trim().max(5000).optional(),
  client_status: z.string().trim().max(80).nullable().optional(),
  notification_read: z.boolean().optional(),
})

const taskCreateSchema = taskChangesSchema.extend({
  title: z.string().trim().min(1).max(160),
})

const taskPatchSchema = z.object({
  id: z.string().uuid(),
  changes: taskChangesSchema,
})

const taskDeleteSchema = z.object({
  id: z.string().uuid(),
})

const sanitizeTaskPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).filter(
      ([key, value]) => allowedTaskFields.has(key) && value !== undefined
    )
  )

const normalizeTaskPayload = (payload: Record<string, unknown>) => {
  const sanitized = sanitizeTaskPayload(payload)

  for (const key of ["title", "description", "client_name", "column_id", "client_feedback", "client_status"]) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeOptionalPlainText(sanitized[key])
    }
  }

  if (typeof sanitized.drive_link === "string" && sanitized.drive_link && !isSafeHttpUrl(sanitized.drive_link)) {
    throw new Error("INVALID_LINK")
  }

  if (typeof sanitized.approval_link === "string" && sanitized.approval_link && !isSafeHttpUrl(sanitized.approval_link)) {
    throw new Error("INVALID_LINK")
  }

  return sanitized
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const { data, error } = await supabase
      .from("board_cards")
      .select(taskColumns)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ tasks: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar tarefas."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "tasks:post", max: 80 })
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = taskCreateSchema.parse(await request.json())
    const payload: Record<string, unknown> = {
      ...normalizeTaskPayload(body),
      user_id: user.id,
    }

    if (typeof payload.title !== "string" || !payload.title.trim()) {
      return NextResponse.json({ error: "O título da tarefa é obrigatório." }, { status: 400 })
    }

    const { data, error } = await supabase.from("board_cards").insert(payload).select(taskColumns).single()

    if (error || !data) {
      return NextResponse.json({ error: "Não foi possível salvar a tarefa." }, { status: 400 })
    }

    return NextResponse.json({ task: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados da tarefa inválidos." }, { status: 400 })
    }
    if (error instanceof Error && error.message === "INVALID_LINK") {
      return NextResponse.json({ error: "Link inválido." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Erro ao criar tarefa."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "tasks:patch", max: 120 })
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = taskPatchSchema.parse(await request.json())

    await requireOwnedResource(supabase, { table: "board_cards", id: body.id, userId: user.id })

    const sanitizedChanges = normalizeTaskPayload(body.changes)

    if (Object.keys(sanitizedChanges).length === 0) {
      return NextResponse.json({ error: "Nenhum campo válido da tarefa foi enviado." }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("board_cards")
      .update(sanitizedChanges)
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select(taskColumns)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: "Erro ao atualizar tarefa." }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Tarefa não encontrada ou sem permissão." }, { status: 404 })
    }

    return NextResponse.json({ task: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados da tarefa inválidos." }, { status: 400 })
    }
    if (error instanceof Error && error.message === "FORBIDDEN_RESOURCE") {
      return NextResponse.json({ error: "Tarefa não encontrada ou sem permissão." }, { status: 403 })
    }
    if (error instanceof Error && error.message === "INVALID_LINK") {
      return NextResponse.json({ error: "Link inválido." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Erro ao atualizar tarefa."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "tasks:delete", max: 60 })
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = taskDeleteSchema.parse(await request.json())

    await requireOwnedResource(supabase, { table: "board_cards", id: body.id, userId: user.id })

    const { data, error } = await supabase
      .from("board_cards")
      .delete()
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: "Erro ao remover tarefa." }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Tarefa não encontrada ou sem permissão." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Tarefa inválida." }, { status: 400 })
    }
    if (error instanceof Error && error.message === "FORBIDDEN_RESOURCE") {
      return NextResponse.json({ error: "Tarefa não encontrada ou sem permissão." }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : "Erro ao remover tarefa."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
