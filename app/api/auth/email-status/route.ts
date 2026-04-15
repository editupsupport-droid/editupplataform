import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 })
  }

  try {
    const { email } = (await request.json()) as { email?: string }
    const normalizedEmail = email?.trim().toLowerCase()

    if (!normalizedEmail) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(normalizedEmail)}&select=id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível consultar o e-mail." }, { status: 500 })
    }

    const profiles = (await response.json()) as Array<{ id: string }>
    return NextResponse.json({ exists: profiles.length > 0 })
  } catch {
    return NextResponse.json({ error: "Falha ao validar o e-mail." }, { status: 500 })
  }
}
