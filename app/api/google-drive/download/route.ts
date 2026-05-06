import { Readable } from "node:stream"
import { NextRequest, NextResponse } from "next/server"
import { getDriveFileMeta, getDriveFileStream } from "@/lib/google-drive"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(request)
    const fileId = request.nextUrl.searchParams.get("fileId")?.trim() ?? ""

    if (!fileId) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 })
    }

    const [meta, driveResponse] = await Promise.all([
      getDriveFileMeta(user.id, fileId),
      getDriveFileStream(user.id, fileId),
    ])

    const stream = driveResponse.data as Readable

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": meta.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(meta.name || "arquivo")}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível baixar o arquivo."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
