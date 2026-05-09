import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { enforceApiRateLimit, ensureSameOrigin, requireAdminAuthenticatedUser, sanitizeOptionalPlainText } from "@/lib/api-admin"

export const runtime = "nodejs"

const preferencesColumns = "monthly_revenue_goal,app_language,appearance_theme"

const preferencesSchema = z.object({
  monthlyRevenueGoal: z.number().min(0).max(999999999).optional(),
  language: z.enum(["pt", "en", "es"]).optional(),
  theme: z.record(z.unknown()).optional(),
  accountName: z.string().trim().min(1).max(120).optional(),
  accountPhotoUrl: z.string().trim().max(1_500_000).optional(),
  accountPhotoPosition: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
  pixKey: z.string().trim().max(200).optional(),
})

const getAppearanceObject = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const getAccountObject = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const mapPreferences = (profile: Record<string, unknown>) => ({
  accountName: String(getAccountObject(getAppearanceObject(profile.appearance_theme).__account).name ?? ""),
  accountPhotoUrl: String(getAccountObject(getAppearanceObject(profile.appearance_theme).__account).photoUrl ?? ""),
  accountPhotoPosition: getAccountObject(getAppearanceObject(profile.appearance_theme).__account).photoPosition ?? { x: 50, y: 50 },
  pixKey: String(getAccountObject(getAppearanceObject(profile.appearance_theme).__account).pixKey ?? ""),
  monthlyRevenueGoal: Number(profile.monthly_revenue_goal ?? 5000),
  language:
    profile.app_language === "pt" || profile.app_language === "en" || profile.app_language === "es"
      ? profile.app_language
      : "pt",
  theme: profile.appearance_theme ?? null,
})

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const { data, error } = await supabase.from("profiles").select(preferencesColumns).eq("id", user.id).single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Não foi possível carregar preferências." }, { status: 400 })
    }

    return NextResponse.json({ preferences: mapPreferences(data) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar preferências."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "preferences:patch", 60)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const body = preferencesSchema.parse(await request.json())
    const updates: Record<string, unknown> = {}
    const hasAccountUpdate = Boolean(body.accountName || body.accountPhotoUrl !== undefined || body.accountPhotoPosition || body.pixKey !== undefined)
    const hasThemeUpdate = body.theme !== undefined

    if (typeof body.monthlyRevenueGoal === "number") {
      updates.monthly_revenue_goal = body.monthlyRevenueGoal
    }

    if (body.language) {
      updates.app_language = body.language
    }

    if (hasAccountUpdate || hasThemeUpdate) {
      const { data: currentProfile, error: currentError } = await supabase
        .from("profiles")
        .select("appearance_theme")
        .eq("id", user.id)
        .single()

      if (currentError || !currentProfile) {
        return NextResponse.json({ error: "Não foi possível carregar preferências." }, { status: 400 })
      }

      const currentAppearance = getAppearanceObject(currentProfile.appearance_theme)
      const currentAccount = getAccountObject(currentAppearance.__account)
      updates.appearance_theme = {
        ...currentAppearance,
        ...(hasThemeUpdate ? body.theme : {}),
        __account: {
          ...currentAccount,
          ...(body.accountName ? { name: sanitizeOptionalPlainText(body.accountName) } : {}),
          ...(body.accountPhotoUrl !== undefined ? { photoUrl: body.accountPhotoUrl } : {}),
          ...(body.accountPhotoPosition ? { photoPosition: body.accountPhotoPosition } : {}),
          ...(body.pixKey !== undefined ? { pixKey: sanitizeOptionalPlainText(body.pixKey) } : {}),
        },
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhuma preferência para salvar." }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(preferencesColumns)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Não foi possível salvar preferências." }, { status: 400 })
    }

    return NextResponse.json({ preferences: mapPreferences(data) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Preferência inválida." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Não foi possível salvar preferências."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
