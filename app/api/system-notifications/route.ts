import { NextRequest, NextResponse } from "next/server"
import { readEditUpState } from "@/lib/editup-state"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(request)
    const state = await readEditUpState()
    const notifications = state.userNotifications
      .filter((item) => item.userId === user.id)
      .slice(0, 30)

    return NextResponse.json({ notifications })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os avisos do sistema."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
