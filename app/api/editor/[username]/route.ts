import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { quoteChoices } from "@/lib/quote-config"
import { getQuoteStartingPriceFromConfig, normalizeQuoteBuilderConfig } from "@/lib/quote-builder"

export const runtime = "nodejs"

const getObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const isMissingQuoteConfigColumn = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "message" in error &&
  String((error as { message?: string }).message).includes("quote_form_config")

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase não está configurado." }, { status: 500 })
  }

  const { username } = await context.params

  if (!username) {
    return NextResponse.json({ error: "Editor inválido." }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let editorQuery = await supabase
    .from("profiles")
    .select("id,full_name,professional_title,slug,appearance_theme,quote_form_config")
    .eq("slug", username)
    .maybeSingle()

  if (editorQuery.error && isMissingQuoteConfigColumn(editorQuery.error)) {
    editorQuery = await supabase
      .from("profiles")
      .select("id,full_name,professional_title,slug,appearance_theme")
      .eq("slug", username)
      .maybeSingle()
  }

  if (editorQuery.error) {
    return NextResponse.json({ error: "Não foi possível carregar o editor." }, { status: 500 })
  }

  if (!editorQuery.data) {
    return NextResponse.json({ error: "Editor não encontrado." }, { status: 404 })
  }

  const editor = editorQuery.data
  const appearanceTheme = getObject(editor.appearance_theme)
  const quoteBuilder = normalizeQuoteBuilderConfig(
    "quote_form_config" in editor ? editor.quote_form_config ?? appearanceTheme.__quoteBuilder : appearanceTheme.__quoteBuilder
  )
  const { data: quotePresets } = await supabase
    .from("quote_presets")
    .select("id,name,description,category_id,add_on_ids,answers,manual_adjustment,client_message")
    .eq("editor_id", editor.id)
    .order("created_at", { ascending: false })

  return NextResponse.json({
    editor: {
      id: editor.id,
      username: editor.slug,
      name: editor.full_name || "Editor de vídeo",
      title: editor.professional_title || "Editor de vídeo",
      startingPrice: getQuoteStartingPriceFromConfig(quoteBuilder),
    },
    pricing: quoteChoices,
    quoteBuilder,
    quotePresets: (quotePresets ?? []).map((preset) => ({
      id: preset.id,
      label: preset.name,
      description: preset.description ?? "",
      categoryId: preset.category_id,
      addOnIds: Array.isArray(preset.add_on_ids) ? preset.add_on_ids : [],
      answers: preset.answers ?? {},
      manualAdjustment: Number(preset.manual_adjustment ?? 0),
      clientMessage: preset.client_message ?? "",
    })),
  })
}
