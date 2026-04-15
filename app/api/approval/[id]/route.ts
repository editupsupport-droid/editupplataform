import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não configurado.")
  }

  return { supabaseUrl, serviceRoleKey }
}

const jsonHeaders = (serviceRoleKey: string) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
})

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()

    const response = await fetch(
      `${supabaseUrl}/rest/v1/board_cards?id=eq.${id}&select=id,title,description,client_name,drive_link,approval_link,client_status`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível carregar a aprovação." }, { status: 500 })
    }

    const [task] = (await response.json()) as Array<{
      id: string
      title: string
      description: string | null
      client_name: string | null
      drive_link: string | null
      approval_link: string | null
      client_status: string | null
    }>

    if (!task || !task.approval_link || (task.client_status && task.client_status !== "pendente")) {
      return NextResponse.json({ available: false }, { status: 404 })
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
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar aprovação."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as { action?: "approve" | "revision"; feedback?: string }
    const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()

    const status = body.action === "approve" ? "concluido" : "refazendo"
    const columnId = body.action === "approve" ? "concluido" : "refazendo"
    const feedback = body.action === "revision" ? body.feedback?.trim() ?? "" : ""

    if (body.action === "revision" && !feedback) {
      return NextResponse.json({ error: "O feedback é obrigatório." }, { status: 400 })
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/board_cards?id=eq.${id}&approval_link=not.is.null`, {
      method: "PATCH",
      headers: {
        ...jsonHeaders(serviceRoleKey),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        approved: body.action === "approve",
        client_status: status,
        column_id: columnId,
        client_feedback: feedback,
        approval_link: null,
        notification_read: false,
      }),
    })

    if (!response.ok) {
      const fallbackResponse = await fetch(`${supabaseUrl}/rest/v1/board_cards?id=eq.${id}&approval_link=not.is.null`, {
        method: "PATCH",
        headers: {
          ...jsonHeaders(serviceRoleKey),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          approved: body.action === "approve",
          client_status: status,
          column_id: columnId,
          client_feedback: feedback,
          approval_link: null,
        }),
      })

      if (!fallbackResponse.ok) {
        return NextResponse.json({ error: "Não foi possível registrar a resposta." }, { status: 500 })
      }

      const fallbackRows = (await fallbackResponse.json()) as Array<{ id: string }>
      if (!fallbackRows.length) {
        return NextResponse.json({ error: "Esse link não está mais disponível." }, { status: 404 })
      }

      return NextResponse.json({ success: true, status, feedback })
    }

    const rows = (await response.json()) as Array<{ id: string }>
    if (!rows.length) {
      return NextResponse.json({ error: "Esse link não está mais disponível." }, { status: 404 })
    }

    return NextResponse.json({ success: true, status, feedback })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao responder aprovação."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
