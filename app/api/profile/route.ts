import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthenticatedUser } from "@/lib/supabase-server"
import { enforceRateLimit, ensureTrustedOrigin, isSafeHttpUrl, sanitizeOptionalPlainText } from "@/lib/security"

export const runtime = "nodejs"
const profileColumns =
  "id,email,full_name,professional_title,bio,location,slug,banner_url,video_url,edit_tools,video_styles,contact_method,contact_value,plan,can_publish_jobs,monthly_revenue_goal,app_language,appearance_theme,created_at,updated_at"

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
  themeColors?: {
    pageBackground?: string
    cardBackground?: string
    textColor?: string
    accentColor?: string
  }
  portfolioTemplate?: "studio-pro" | "viral-creator" | "minimal-luxury"
  monthlyRevenueGoal?: number
  appLanguage?: "pt" | "en" | "es"
  appearanceTheme?: unknown
}

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  professionalTitle: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(120).optional(),
  language: z.enum(["en", "pt-BR", "es"]).optional(),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido.").optional(),
  bannerUrl: z.string().trim().max(500).optional(),
  photoUrl: z.string().trim().max(500).optional(),
  videoUrls: z.array(z.string().trim().max(500)).max(10).optional(),
  editTools: z.array(z.string().trim().max(80)).max(20).optional(),
  videoStyles: z.array(z.string().trim().max(80)).max(20).optional(),
  contactMethod: z.enum(["phone", "email", "instagram"]).optional(),
  contactValue: z.string().trim().max(200).optional(),
  themeColors: z
    .object({
      pageBackground: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/).optional(),
      cardBackground: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/).optional(),
      textColor: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/).optional(),
      accentColor: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/).optional(),
    })
    .optional(),
  portfolioTemplate: z.enum(["studio-pro", "viral-creator", "minimal-luxury"]).optional(),
  monthlyRevenueGoal: z.number().min(0).max(999999999).optional(),
  appLanguage: z.enum(["pt", "en", "es"]).optional(),
  appearanceTheme: z.record(z.unknown()).optional(),
})

const serializeVideoUrls = (videoUrls: string[] = []) => {
  const normalized = videoUrls.map((url) => url.trim()).filter(Boolean)
  if (normalized.length <= 1) {
    return normalized[0] ?? ""
  }

  return JSON.stringify(normalized)
}

const defaultThemeColors = {
  pageBackground: "#0b1020",
  cardBackground: "#11182d",
  textColor: "#f8fafc",
  accentColor: "#37352F",
}

const serializeBannerAssets = (
  bannerUrl = "",
  photoUrl = "",
  language: ProfilePayload["language"] = "pt-BR",
  themeColors: ProfilePayload["themeColors"] = defaultThemeColors,
  portfolioTemplate: ProfilePayload["portfolioTemplate"] = "studio-pro"
) => {
  const normalizedTheme = {
    pageBackground: themeColors?.pageBackground ?? defaultThemeColors.pageBackground,
    cardBackground: themeColors?.cardBackground ?? defaultThemeColors.cardBackground,
    textColor: themeColors?.textColor ?? defaultThemeColors.textColor,
    accentColor: themeColors?.accentColor ?? defaultThemeColors.accentColor,
  }

  if (!photoUrl.trim() && language === "pt-BR" && portfolioTemplate === "studio-pro" && JSON.stringify(normalizedTheme) === JSON.stringify(defaultThemeColors)) {
    return bannerUrl.trim()
  }

  return JSON.stringify({
    bannerUrl: bannerUrl.trim(),
    photoUrl: photoUrl.trim(),
    language,
    themeColors: normalizedTheme,
    portfolioTemplate,
  })
}

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "profile:post", max: 60 })
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = profileSchema.parse((await request.json()) as ProfilePayload)

    if (body.bannerUrl && !isSafeHttpUrl(body.bannerUrl)) {
      return NextResponse.json({ error: "Banner inválido." }, { status: 400 })
    }

    if (body.photoUrl && !isSafeHttpUrl(body.photoUrl)) {
      return NextResponse.json({ error: "Foto inválida." }, { status: 400 })
    }

    if (body.videoUrls?.some((url) => url && !isSafeHttpUrl(url))) {
      return NextResponse.json({ error: "Um ou mais links de vídeo são inválidos." }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: sanitizeOptionalPlainText(body.fullName),
        professional_title: sanitizeOptionalPlainText(body.professionalTitle),
        bio: sanitizeOptionalPlainText(body.bio),
        location: sanitizeOptionalPlainText(body.location),
        slug: body.slug?.trim() ?? "",
        banner_url: serializeBannerAssets(body.bannerUrl, body.photoUrl, body.language, body.themeColors, body.portfolioTemplate),
        video_url: serializeVideoUrls(body.videoUrls),
        edit_tools: Array.isArray(body.editTools) ? body.editTools.map(sanitizeOptionalPlainText).filter(Boolean) : [],
        video_styles: Array.isArray(body.videoStyles) ? body.videoStyles.map(sanitizeOptionalPlainText).filter(Boolean) : [],
        contact_method: body.contactMethod ?? "email",
        contact_value: sanitizeOptionalPlainText(body.contactValue),
        ...(typeof body.monthlyRevenueGoal === "number" ? { monthly_revenue_goal: body.monthlyRevenueGoal } : {}),
        ...(body.appLanguage ? { app_language: body.appLanguage } : {}),
        ...(body.appearanceTheme ? { appearance_theme: body.appearanceTheme } : {}),
      })
      .eq("id", user.id)
      .select(profileColumns)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Não foi possível salvar o perfil." }, { status: 400 })
    }

    return NextResponse.json({ profile: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Não foi possível salvar o perfil." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Não foi possível salvar o perfil."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
