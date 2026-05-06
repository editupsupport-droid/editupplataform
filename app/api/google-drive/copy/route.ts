import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { copyDriveFileToFolder } from "@/lib/google-drive"
import { enforceRateLimit, ensureTrustedOrigin, sanitizeOptionalPlainText } from "@/lib/security"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"

const copySchema = z.object({
  fileId: z.string().trim().min(1),
  targetFolderId: z.string().trim().min(1),
  name: z.string().trim().max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "google-drive-copy:post", max: 60 })
    if (rateLimitError) return rateLimitError

    const { user } = await requireAuthenticatedUser(request)
    const body = copySchema.parse(await request.json())
    const copied = await copyDriveFileToFolder({
      userId: user.id,
      fileId: body.fileId,
      targetFolderId: body.targetFolderId,
      name: sanitizeOptionalPlainText(body.name) || undefined,
    })

    return NextResponse.json({ file: copied })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Não foi possível salvar o arquivo no Drive."
    return NextResponse.json({ error: message === "Não autenticado." ? message : "Não foi possível salvar o arquivo no Drive." }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
