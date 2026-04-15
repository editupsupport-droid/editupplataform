import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const getConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não configurado.")
  }

  return { supabaseUrl, serviceRoleKey }
}

const baseHeaders = (serviceRoleKey: string) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
})

const jsonHeaders = (serviceRoleKey: string) => ({
  ...baseHeaders(serviceRoleKey),
  "Content-Type": "application/json",
  Prefer: "return=representation",
})

export async function GET(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Usuário inválido." }, { status: 400 })
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/board_cards?user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`,
      {
        headers: baseHeaders(serviceRoleKey),
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || "Não foi possível carregar a agenda." },
        { status: response.status }
      )
    }

    const tasks = (await response.json()) as Array<Record<string, unknown>>
    return NextResponse.json({ tasks })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar tarefas."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const body = (await request.json()) as Record<string, unknown>

    const response = await fetch(`${supabaseUrl}/rest/v1/board_cards`, {
      method: "POST",
      headers: jsonHeaders(serviceRoleKey),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || "Não foi possível salvar a tarefa." },
        { status: response.status }
      )
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>
    return NextResponse.json({ task: rows[0] ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar tarefa."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const body = (await request.json()) as {
      id?: string
      userId?: string
      changes?: Record<string, unknown>
    }

    if (!body.id || !body.userId || !body.changes) {
      return NextResponse.json({ error: "Dados da tarefa inválidos." }, { status: 400 })
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/board_cards?id=eq.${encodeURIComponent(body.id)}&user_id=eq.${encodeURIComponent(body.userId)}`,
      {
        method: "PATCH",
        headers: jsonHeaders(serviceRoleKey),
        body: JSON.stringify(body.changes),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || "Não foi possível atualizar a tarefa." },
        { status: response.status }
      )
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>
    return NextResponse.json({ task: rows[0] ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar tarefa."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
