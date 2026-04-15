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

const headers = (serviceRoleKey: string) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
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
      `${supabaseUrl}/rest/v1/clients?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível carregar os clientes." }, { status: response.status })
    }

    const clients = (await response.json()) as Array<Record<string, unknown>>
    return NextResponse.json({ clients })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar clientes."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const body = (await request.json()) as {
      id?: string
      userId?: string
      name?: string
      phone?: string
      countryCode?: string
      editLevel?: string
      averageDuration?: number
      frequency?: string
      driveLink?: string
    }

    if (!body.userId || !body.name) {
      return NextResponse.json({ error: "Dados do cliente inválidos." }, { status: 400 })
    }

    const payload = {
      user_id: body.userId,
      name: body.name,
      phone: body.phone ?? "",
      country_code: body.countryCode ?? "+55",
      edit_level: body.editLevel ?? "simples",
      average_duration: body.averageDuration ?? 15,
      frequency: body.frequency ?? "",
      drive_link: body.driveLink ?? "",
    }

    const url = body.id
      ? `${supabaseUrl}/rest/v1/clients?id=eq.${encodeURIComponent(body.id)}&user_id=eq.${encodeURIComponent(body.userId)}`
      : `${supabaseUrl}/rest/v1/clients`

    const response = await fetch(url, {
      method: body.id ? "PATCH" : "POST",
      headers: headers(serviceRoleKey),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText || "Não foi possível salvar o cliente." }, { status: response.status })
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>
    const client = rows[0]

    if (!client) {
      return NextResponse.json({ error: "Cliente não retornado pelo banco." }, { status: 500 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar cliente."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const { id, userId } = (await request.json()) as { id?: string; userId?: string }

    if (!id || !userId) {
      return NextResponse.json({ error: "Cliente inválido." }, { status: 400 })
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/clients?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível remover o cliente." }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover cliente."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
