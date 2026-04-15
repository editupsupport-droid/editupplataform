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

export async function GET() {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const response = await fetch(
      `${supabaseUrl}/rest/v1/job_posts?select=*&order=created_at.desc`,
      {
        headers: baseHeaders(serviceRoleKey),
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível carregar as vagas." }, { status: response.status })
    }

    const jobs = (await response.json()) as Array<Record<string, unknown>>
    return NextResponse.json({ jobs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar vagas."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const body = (await request.json()) as Record<string, unknown>

    const response = await fetch(`${supabaseUrl}/rest/v1/job_posts`, {
      method: "POST",
      headers: jsonHeaders(serviceRoleKey),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText || "Não foi possível publicar a vaga." }, { status: response.status })
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>
    return NextResponse.json({ job: rows[0] ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao publicar vaga."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const { id, status, userId } = (await request.json()) as { id?: string; status?: string; userId?: string }

    if (!id || !status || !userId) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/job_posts?id=eq.${encodeURIComponent(id)}&published_by=eq.${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: jsonHeaders(serviceRoleKey),
        body: JSON.stringify({ status }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText || "Não foi possível atualizar a vaga." }, { status: response.status })
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>
    return NextResponse.json({ job: rows[0] ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar vaga."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const { id, userId } = (await request.json()) as { id?: string; userId?: string }

    if (!id || !userId) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/job_posts?id=eq.${encodeURIComponent(id)}&published_by=eq.${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: baseHeaders(serviceRoleKey),
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível remover a vaga." }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover vaga."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
