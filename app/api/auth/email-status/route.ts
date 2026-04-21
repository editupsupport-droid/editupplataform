import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string }
    const normalizedEmail = email?.trim().toLowerCase()

    if (!normalizedEmail) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }

    return NextResponse.json({
      exists: false,
      message: "Verificação direta de e-mail desativada por segurança.",
    })
  } catch {
    return NextResponse.json({ error: "Falha ao validar o e-mail." }, { status: 500 })
  }
}
