import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"
const taskColumns =
  "id,user_id,title,description,client_id,client_name,due_date,column_id,drive_link,approval_link,approved,client_feedback,client_status,notification_read,created_at,updated_at"

type TaskPatchBody = {
  id?: string
  changes?: Record<string, unknown>
}

const allowedTaskFields = new Set([
  "title",
  "description",
  "client_id",
  "client_name",
  "due_date",
  "column_id",
  "drive_link",
  "notification_read",
])

const sanitizeTaskPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).filter(
      ([key, value]) => allowedTaskFields.has(key) && value !== undefined
    )
  )

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
    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = (await request.json()) as Record<string, unknown>
    const payload: Record<string, unknown> = {
      ...sanitizeTaskPayload(body),
      user_id: user.id,
    }

    if (typeof payload.title !== "string" || !payload.title.trim()) {
      return NextResponse.json({ error: "O título da tarefa é obrigatório." }, { status: 400 })
    }

    const { data, error } = await supabase.from("board_cards").insert(payload).select(taskColumns).single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Não foi possível salvar a tarefa." }, { status: 400 })
    }

    return NextResponse.json({ task: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar tarefa."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = (await request.json()) as TaskPatchBody

    if (!body.id || !body.changes) {
      return NextResponse.json({ error: "Dados da tarefa inválidos." }, { status: 400 })
    }

    const sanitizedChanges = sanitizeTaskPayload(body.changes)

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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Tarefa não encontrada ou sem permissão." }, { status: 404 })
    }

    return NextResponse.json({ task: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar tarefa."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
