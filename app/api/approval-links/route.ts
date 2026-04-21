import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/supabase-server"
import { createReviewToken } from "@/lib/review-token"
import { serializeReviewFeedback } from "@/lib/review-utils"

export const runtime = "nodejs"

type ApprovalLinkBody = {
  taskId?: string
  driveLink?: string
  priceUsd?: number | null
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = (await request.json()) as ApprovalLinkBody
    const taskId = body.taskId?.trim() ?? ""
    const driveLink = body.driveLink?.trim() ?? ""

    if (!taskId || !driveLink) {
      return NextResponse.json({ error: "Dados inválidos para gerar o link." }, { status: 400 })
    }

    const reviewToken = createReviewToken()
    const approvalUrl = `${request.nextUrl.origin}/aprovacao/${taskId}?token=${reviewToken}`
    const safePrice = typeof body.priceUsd === "number" && Number.isFinite(body.priceUsd) ? body.priceUsd : null

    const { data, error } = await supabase
      .from("board_cards")
      .update({
        drive_link: driveLink,
        approval_link: approvalUrl,
        column_id: "waiting-response",
        client_status: "pendente",
        notification_read: true,
        client_feedback: serializeReviewFeedback({
          priceUsd: safePrice,
          revisionItems: [],
        }),
      })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select("id,approval_link")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Tarefa não encontrada ou sem permissão." }, { status: 404 })
    }

    return NextResponse.json({ approvalLink: data.approval_link })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível gerar o link de aprovação."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
