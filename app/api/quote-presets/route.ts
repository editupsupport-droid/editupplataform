import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { quoteAnswersSchema } from "@/lib/quote-builder"
import { enforceApiRateLimit, ensureSameOrigin, requireAdminAuthenticatedUser, sanitizePlainText } from "@/lib/api-admin"

export const runtime = "nodejs"

const presetSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Nome do preset é obrigatório.").max(120),
  description: z.string().trim().max(220).default(""),
  categoryId: z.string().trim().min(2),
  addOnIds: z.array(z.string().trim().min(2)).default([]),
  answers: quoteAnswersSchema.default({}),
  manualAdjustment: z.number().int().min(-1_000_000).max(1_000_000).default(0),
  clientMessage: z.string().trim().max(600).default(""),
})

const loadAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não está configurado.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const mapPreset = (item: Record<string, any>) => ({
  id: item.id,
  name: item.name,
  description: item.description ?? "",
  categoryId: item.category_id,
  addOnIds: Array.isArray(item.add_on_ids) ? item.add_on_ids : [],
  answers: item.answers ?? {},
  manualAdjustment: Number(item.manual_adjustment ?? 0),
  clientMessage: item.client_message ?? "",
  createdAt: item.created_at,
  updatedAt: item.updated_at,
})

const safeAnswers = (answers: Record<string, string | string[]>) =>
  Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [
      sanitizePlainText(key),
      Array.isArray(value) ? value.map((item) => sanitizePlainText(item)) : sanitizePlainText(value),
    ])
  )

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAdminAuthenticatedUser(request)
    const supabase = loadAdminClient()
    const { data, error } = await supabase
      .from("quote_presets")
      .select("id,name,description,category_id,add_on_ids,answers,manual_adjustment,client_message,created_at,updated_at")
      .eq("editor_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Não foi possível carregar os presets." }, { status: 500 })
    }

    return NextResponse.json({ presets: (data ?? []).map(mapPreset) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os presets."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "quote-presets:write", 60)
    if (rateLimitError) return rateLimitError

    const { user } = await requireAdminAuthenticatedUser(request)
    const body = presetSchema.parse(await request.json())
    const supabase = loadAdminClient()

    const payload = {
      editor_id: user.id,
      name: sanitizePlainText(body.name),
      description: sanitizePlainText(body.description),
      category_id: sanitizePlainText(body.categoryId),
      add_on_ids: body.addOnIds.map((item) => sanitizePlainText(item)),
      answers: safeAnswers(body.answers),
      manual_adjustment: body.manualAdjustment,
      client_message: sanitizePlainText(body.clientMessage),
      updated_at: new Date().toISOString(),
    }

    const query = body.id
      ? supabase.from("quote_presets").update(payload).eq("id", body.id).eq("editor_id", user.id)
      : supabase.from("quote_presets").insert(payload)

    const { data, error } = await query
      .select("id,name,description,category_id,add_on_ids,answers,manual_adjustment,client_message,created_at,updated_at")
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Não foi possível salvar o preset." }, { status: 500 })
    }

    return NextResponse.json({ preset: mapPreset(data) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Preset inválido." }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Não foi possível salvar o preset."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const { user } = await requireAdminAuthenticatedUser(request)
    const id = request.nextUrl.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Preset inválido." }, { status: 400 })
    }

    const supabase = loadAdminClient()
    const { error } = await supabase
      .from("quote_presets")
      .delete()
      .eq("id", id)
      .eq("editor_id", user.id)

    if (error) {
      return NextResponse.json({ error: "Não foi possível remover o preset." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível remover o preset."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
