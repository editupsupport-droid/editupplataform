import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { enforceApiRateLimit, ensureSameOrigin, requireAdminAuthenticatedUser } from "@/lib/api-admin"

export const runtime = "nodejs"

const schema = z.object({
  resourceId: z.string().uuid(),
  type: z.enum(["like", "dislike"]).nullable(),
})

export async function PATCH(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "community-interactions:patch", 120)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const body = schema.parse(await request.json())

    if (body.type === null) {
      const { error } = await supabase
        .from("community_resource_interactions")
        .delete()
        .eq("resource_id", body.resourceId)
        .eq("user_id", user.id)

      if (error) return NextResponse.json({ error: "Não foi possível salvar interação." }, { status: 400 })
      return NextResponse.json({ interaction: null })
    }

    const { data, error } = await supabase
      .rpc("set_community_resource_interaction", {
        p_resource_id: body.resourceId,
        p_user_id: user.id,
        p_interaction_type: body.type,
      })
      .single()

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("community_resource_interactions")
        .upsert(
          {
            resource_id: body.resourceId,
            user_id: user.id,
            interaction_type: body.type,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "resource_id,user_id" }
        )
        .select("interaction_type")
        .single()

      if (fallbackError) {
        return NextResponse.json({ error: "Não foi possível salvar interação." }, { status: 400 })
      }

      const fallbackInteraction = fallbackData as { interaction_type: "like" | "dislike" }
      return NextResponse.json({ interaction: fallbackInteraction.interaction_type })
    }

    const interaction = data as { interaction_type: "like" | "dislike" }
    return NextResponse.json({ interaction: interaction.interaction_type })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Não foi possível salvar interação."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
