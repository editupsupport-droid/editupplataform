import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/supabase-server"
import { buildGoogleDriveAuthUrl, encodeDriveState } from "@/lib/google-drive"
import { enforceRateLimit, ensureTrustedOrigin } from "@/lib/security"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "google-drive-auth:post", max: 20 })
    if (rateLimitError) return rateLimitError

    const { user } = await requireAuthenticatedUser(request)
    const body = (await request.json().catch(() => ({}))) as { returnTo?: string }
    const state = encodeDriveState({
      userId: user.id,
      returnTo: body.returnTo?.trim() || "/dashboard/pack",
    })

    return NextResponse.json({ url: buildGoogleDriveAuthUrl(state) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível iniciar a conexão com o Google Drive."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
