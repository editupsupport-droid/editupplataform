import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit, ensureTrustedOrigin } from "@/lib/security"

export const runtime = "nodejs"

const schema = z.object({
  email: z.string().trim().email(),
})

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "email-status:post", max: 30 })
    if (rateLimitError) return rateLimitError

    schema.parse(await request.json())

    return NextResponse.json({
      exists: false,
      message: "Verificação direta de e-mail desativada por segurança.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }
    return NextResponse.json({ error: "Falha ao validar o e-mail." }, { status: 500 })
  }
}
