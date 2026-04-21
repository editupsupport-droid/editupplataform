import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase não está configurado." }, { status: 500 })
  }

  const { slug } = await context.params

  if (!slug) {
    return NextResponse.json({ error: "Link público inválido." }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "full_name,professional_title,bio,location,banner_url,video_url,edit_tools,video_styles,contact_method,contact_value"
    )
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: "Não foi possível carregar o perfil." }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 })
  }
  return NextResponse.json(profile)
}
