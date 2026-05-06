import { NextRequest, NextResponse } from "next/server"
import { enforceRateLimit, ensureTrustedOrigin, sanitizePlainText } from "@/lib/security"
import { uploadDriveFileToFolder } from "@/lib/google-drive"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "google-drive-upload:post", max: 40 })
    if (rateLimitError) return rateLimitError

    const { user } = await requireAuthenticatedUser(request)
    const formData = await request.formData()
    const folderId = String(formData.get("folderId") ?? "").trim()
    const file = formData.get("file")

    if (!folderId || !(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo ou pasta inválidos." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadDriveFileToFolder({
      userId: user.id,
      folderId,
      fileName: sanitizePlainText(file.name) || "arquivo",
      mimeType: file.type || "application/octet-stream",
      buffer,
    })

    return NextResponse.json({ file: uploaded })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível enviar o arquivo ao Drive."
    return NextResponse.json({ error: message === "Não autenticado." ? message : "Não foi possível enviar o arquivo ao Drive." }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
