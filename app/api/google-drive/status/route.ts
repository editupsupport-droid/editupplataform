import { NextRequest, NextResponse } from "next/server"
import { getAuthorizedDriveClient, getDriveConnection } from "@/lib/google-drive"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(request)
    const connection = await getDriveConnection(user.id)

    if (!connection) {
      return NextResponse.json({ connected: false })
    }

    await getAuthorizedDriveClient(user.id)

    return NextResponse.json({
      connected: true,
      driveEmail: connection.driveEmail,
      scope: connection.scope,
      tokenExpiresAt: connection.tokenExpiresAt,
      picker: {
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_PICKER_API_KEY ?? "",
        appId: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID ?? "",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar o status do Google Drive."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
