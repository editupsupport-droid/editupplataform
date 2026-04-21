import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"
const profileColumns =
  "id,email,full_name,professional_title,bio,location,slug,banner_url,video_url,edit_tools,video_styles,contact_method,contact_value,plan,can_publish_jobs,created_at,updated_at"

type ProfilePayload = {
  fullName?: string
  professionalTitle?: string
  bio?: string
  location?: string
  language?: "en" | "pt-BR" | "es"
  slug?: string
  bannerUrl?: string
  photoUrl?: string
  videoUrls?: string[]
  editTools?: string[]
  videoStyles?: string[]
  contactMethod?: string
  contactValue?: string
}

const serializeVideoUrls = (videoUrls: string[] = []) => {
  const normalized = videoUrls.map((url) => url.trim()).filter(Boolean)
  if (normalized.length <= 1) {
    return normalized[0] ?? ""
  }

  return JSON.stringify(normalized)
}

const serializeBannerAssets = (bannerUrl = "", photoUrl = "", language: ProfilePayload["language"] = "pt-BR") => {
  if (!photoUrl.trim() && language === "pt-BR") {
    return bannerUrl.trim()
  }

  return JSON.stringify({
    bannerUrl: bannerUrl.trim(),
    photoUrl: photoUrl.trim(),
    language,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = (await request.json()) as ProfilePayload

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: body.fullName?.trim() ?? "",
        professional_title: body.professionalTitle?.trim() ?? "",
        bio: body.bio?.trim() ?? "",
        location: body.location?.trim() ?? "",
        slug: body.slug?.trim() ?? "",
        banner_url: serializeBannerAssets(body.bannerUrl, body.photoUrl, body.language),
        video_url: serializeVideoUrls(body.videoUrls),
        edit_tools: Array.isArray(body.editTools) ? body.editTools : [],
        video_styles: Array.isArray(body.videoStyles) ? body.videoStyles : [],
        contact_method: body.contactMethod ?? "email",
        contact_value: body.contactValue?.trim() ?? "",
      })
      .eq("id", user.id)
      .select(profileColumns)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Não foi possível salvar o perfil." }, { status: 400 })
    }

    return NextResponse.json({ profile: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar o perfil."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
