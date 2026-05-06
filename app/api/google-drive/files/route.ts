import { NextRequest, NextResponse } from "next/server"
import { listDriveFiles } from "@/lib/google-drive"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(request)
    const folderId = request.nextUrl.searchParams.get("folderId")?.trim() || undefined
    const query = request.nextUrl.searchParams.get("query")?.trim() || undefined
    const mimeGroup = request.nextUrl.searchParams.get("mimeGroup")?.trim() || undefined

    const files = await listDriveFiles({
      userId: user.id,
      folderId,
      query,
      mimePrefix: mimeGroup === "video" || mimeGroup === "folder" ? mimeGroup : undefined,
    })

    return NextResponse.json({
      files: files.map((file) => ({
        id: file.id ?? "",
        name: file.name ?? "Arquivo",
        mimeType: file.mimeType ?? "",
        size: file.size ? Number(file.size) : null,
        modifiedTime: file.modifiedTime ?? null,
        webViewLink: file.webViewLink ?? "",
        webContentLink: file.webContentLink ?? "",
        thumbnailLink: file.thumbnailLink ?? "",
        parents: file.parents ?? [],
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível listar os arquivos do Drive."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
