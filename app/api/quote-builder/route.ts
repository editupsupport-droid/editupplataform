import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { quoteBuilderConfigSchema, normalizeQuoteBuilderConfig } from "@/lib/quote-builder"
import { enforceApiRateLimit, ensureSameOrigin, requireAdminAuthenticatedUser } from "@/lib/api-admin"

export const runtime = "nodejs"

const getObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const isMissingQuoteConfigColumn = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "message" in error &&
  String((error as { message?: string }).message).includes("quote_form_config")

const loadQuoteConfigProfile = async (supabase: Awaited<ReturnType<typeof requireAdminAuthenticatedUser>>["supabase"], userId: string) => {
  const withDedicatedColumn = await supabase
    .from("profiles")
    .select("quote_form_config,appearance_theme")
    .eq("id", userId)
    .single()

  if (!withDedicatedColumn.error && withDedicatedColumn.data) {
    return {
      dedicatedColumnAvailable: true,
      appearanceTheme: getObject(withDedicatedColumn.data.appearance_theme),
      config: normalizeQuoteBuilderConfig(
        withDedicatedColumn.data.quote_form_config ??
        getObject(withDedicatedColumn.data.appearance_theme).__quoteBuilder
      ),
    }
  }

  if (!isMissingQuoteConfigColumn(withDedicatedColumn.error)) {
    throw new Error("Não foi possível carregar o construtor de orçamento.")
  }

  const fallback = await supabase
    .from("profiles")
    .select("appearance_theme")
    .eq("id", userId)
    .single()

  if (fallback.error || !fallback.data) {
    throw new Error("Não foi possível carregar o construtor de orçamento.")
  }

  const appearanceTheme = getObject(fallback.data.appearance_theme)
  return {
    dedicatedColumnAvailable: false,
    appearanceTheme,
    config: normalizeQuoteBuilderConfig(appearanceTheme.__quoteBuilder),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const profile = await loadQuoteConfigProfile(supabase, user.id)
    return NextResponse.json({ config: profile.config })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar o construtor de orçamento."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "quote-builder:patch", 40)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const body = z.object({ config: quoteBuilderConfigSchema }).parse(await request.json())
    const currentProfile = await loadQuoteConfigProfile(supabase, user.id)

    if (currentProfile.dedicatedColumnAvailable) {
      const dedicatedUpdate = await supabase
        .from("profiles")
        .update({ quote_form_config: body.config })
        .eq("id", user.id)

      if (!dedicatedUpdate.error) {
        return NextResponse.json({ config: body.config })
      }

      if (!isMissingQuoteConfigColumn(dedicatedUpdate.error)) {
        return NextResponse.json({ error: "Não foi possível salvar o construtor de orçamento." }, { status: 400 })
      }
    }

    const fallbackUpdate = await supabase
      .from("profiles")
      .update({
        appearance_theme: {
          ...currentProfile.appearanceTheme,
          __quoteBuilder: body.config,
        },
      })
      .eq("id", user.id)

    if (fallbackUpdate.error) {
      return NextResponse.json({ error: "Não foi possível salvar o construtor de orçamento." }, { status: 400 })
    }

    return NextResponse.json({ config: body.config })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Configuração inválida." }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Não foi possível salvar o construtor de orçamento."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
