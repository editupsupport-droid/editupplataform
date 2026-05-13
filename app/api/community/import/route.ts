import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { enforceApiRateLimit, ensureSameOrigin, requireAdminAuthenticatedUser, sanitizePlainText } from "@/lib/api-admin"
import { createDriveFolderShortcut } from "@/lib/google-drive"
import { planMeets, type PlanId } from "@/lib/app-data"

export const runtime = "nodejs"

const schema = z.object({
  resourceId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "community-import:post", 60)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const body = schema.parse(await request.json())
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle()

    if (!planMeets((profile?.plan as PlanId | undefined) ?? "free", "essential")) {
      return NextResponse.json({ error: "Download disponível a partir do plano Essential." }, { status: 403 })
    }

    const { data: resource, error } = await supabase
      .from("community_resources")
      .select("title,drive_folder_id,drive_folder_name")
      .eq("id", body.resourceId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: "Não foi possível importar para o Drive." }, { status: 400 })
    if (!resource) return NextResponse.json({ error: "Recurso não encontrado." }, { status: 404 })

    const shortcut = await createDriveFolderShortcut({
      userId: user.id,
      folderId: resource.drive_folder_id,
      name: sanitizePlainText(`EditUp - ${resource.drive_folder_name || resource.title}`),
    })

    return NextResponse.json({ file: shortcut })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Não foi possível importar para o Drive."
    return NextResponse.json({ error: message === "Não autenticado." ? message : "Não foi possível importar para o Drive." }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
