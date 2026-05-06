import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthenticatedUser } from "@/lib/supabase-server"
import { enforceRateLimit, ensureTrustedOrigin, sanitizePlainText } from "@/lib/security"

export const runtime = "nodejs"

const schema = z.object({
  resourceId: z.string().uuid(),
  body: z.string().trim().min(1).max(800),
})

const getAccountName = (profile: { full_name?: string | null; appearance_theme?: unknown } | null, fallback: string) => {
  const appearance = profile?.appearance_theme && typeof profile.appearance_theme === "object" && !Array.isArray(profile.appearance_theme)
    ? profile.appearance_theme as Record<string, unknown>
    : {}
  const account = appearance.__account && typeof appearance.__account === "object" && !Array.isArray(appearance.__account)
    ? appearance.__account as Record<string, unknown>
    : {}
  return String(account.name || profile?.full_name || fallback || "Editor")
}

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "community-comments:post", max: 60 })
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = schema.parse(await request.json())
    const sanitizedBody = sanitizePlainText(body.body)

    if (!sanitizedBody) {
      return NextResponse.json({ error: "Comentário inválido." }, { status: 400 })
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,appearance_theme")
      .eq("id", user.id)
      .maybeSingle()

    const { data, error } = await supabase
      .from("community_resource_comments")
      .insert({
        resource_id: body.resourceId,
        user_id: user.id,
        author_name: getAccountName(profile, user.email ?? "Editor"),
        body: sanitizedBody,
      })
      .select("id,author_name,body,created_at")
      .single()

    if (error) return NextResponse.json({ error: "Não foi possível comentar." }, { status: 400 })

    return NextResponse.json({
      comment: {
        id: data.id,
        authorName: data.author_name,
        body: data.body,
        createdAt: data.created_at,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Comentário inválido." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Não foi possível comentar."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
