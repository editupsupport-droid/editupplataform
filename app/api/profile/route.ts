import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type ProfilePayload = {
  userId?: string
  fullName?: string
  professionalTitle?: string
  bio?: string
  location?: string
  slug?: string
  bannerUrl?: string
  photoUrl?: string
  videoUrls?: string[]
  editTools?: string[]
  videoStyles?: string[]
  contactMethod?: string
  contactValue?: string
}

const jsonHeaders = (serviceRoleKey: string) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
})

const serializeVideoUrls = (videoUrls: string[] = []) => {
  const normalized = videoUrls.map((url) => url.trim()).filter(Boolean)
  if (normalized.length <= 1) {
    return normalized[0] ?? ""
  }

  return JSON.stringify(normalized)
}

const serializeBannerAssets = (bannerUrl = "", photoUrl = "") => {
  if (!photoUrl.trim()) {
    return bannerUrl.trim()
  }

  return JSON.stringify({
    bannerUrl: bannerUrl.trim(),
    photoUrl: photoUrl.trim(),
  })
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 })
  }

  try {
    const body = (await request.json()) as ProfilePayload

    if (!body.userId) {
      return NextResponse.json({ error: "Usuário inválido." }, { status: 400 })
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${body.userId}`, {
      method: "PATCH",
      headers: jsonHeaders(serviceRoleKey),
      body: JSON.stringify({
        full_name: body.fullName?.trim() ?? "",
        professional_title: body.professionalTitle?.trim() ?? "",
        bio: body.bio?.trim() ?? "",
        location: body.location?.trim() ?? "",
        slug: body.slug?.trim() ?? "",
        banner_url: serializeBannerAssets(body.bannerUrl, body.photoUrl),
        video_url: serializeVideoUrls(body.videoUrls),
        edit_tools: Array.isArray(body.editTools) ? body.editTools : [],
        video_styles: Array.isArray(body.videoStyles) ? body.videoStyles : [],
        contact_method: body.contactMethod ?? "email",
        contact_value: body.contactValue?.trim() ?? "",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || "Não foi possível salvar o perfil." },
        { status: response.status }
      )
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>
    const updatedProfile = rows[0]

    if (!updatedProfile) {
      return NextResponse.json({ error: "Perfil não encontrado para atualização." }, { status: 404 })
    }

    return NextResponse.json({ profile: updatedProfile })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar perfil."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
