import { NextRequest, NextResponse } from "next/server"
import { slugify } from "@/lib/app-data"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 })
  }

  const { slug } = await context.params

  if (!slug) {
    return NextResponse.json({ error: "Slug inválido." }, { status: 400 })
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  }

  const profileFields =
    "full_name,professional_title,bio,location,banner_url,video_url,edit_tools,video_styles,contact_method,contact_value,email,slug"

  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?slug=eq.${encodeURIComponent(slug)}&select=${profileFields}`,
    {
      headers,
      cache: "no-store",
    }
  )

  if (!response.ok) {
    return NextResponse.json({ error: "Não foi possível carregar o perfil." }, { status: 500 })
  }

  const profiles = (await response.json()) as Array<Record<string, unknown>>
  let profile: Record<string, unknown> | null = profiles[0] ?? null

  if (!profile) {
    // Fallback for legacy slugs that may have been generated differently before accent normalization fixes.
    const fallbackResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=${profileFields}&limit=200`,
      {
        headers,
        cache: "no-store",
      }
    )

    if (!fallbackResponse.ok) {
      return NextResponse.json({ error: "Não foi possível carregar o perfil." }, { status: 500 })
    }

    const fallbackProfiles = (await fallbackResponse.json()) as Array<Record<string, unknown>>
    profile =
      fallbackProfiles.find((candidate) => slugify(String(candidate.full_name ?? "")) === slug) ??
      fallbackProfiles.find((candidate) => {
        const email = String(candidate.email ?? "")
        return slugify(email.split("@")[0] ?? "") === slug
      }) ??
      null
  }

  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 })
  }

  const { email: _email, slug: _storedSlug, ...publicProfile } = profile

  return NextResponse.json(publicProfile)
}
