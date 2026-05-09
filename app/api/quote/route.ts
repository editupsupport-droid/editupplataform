import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  QUOTE_DURATIONS,
  QUOTE_EXTRAS,
  QUOTE_LEVELS,
  QUOTE_VIDEO_TYPES,
  type QuoteDuration,
  type QuoteExtra,
  type QuoteLevel,
  type QuoteVideoType,
  calculateQuote,
  defaultQuoteExtras,
} from "@/lib/quote-config"
import {
  calculateDynamicQuote,
  formatQuoteBreakdownForNotes,
  normalizeQuoteBuilderConfig,
  quoteAnswersSchema,
  summarizeQuoteSelection,
  validateQuoteAnswers,
} from "@/lib/quote-builder"
import { enforceApiRateLimit, ensureSameOrigin, getSupabaseAdmin, requireAdminAuthenticatedUser, sanitizePlainText } from "@/lib/api-admin"

export const runtime = "nodejs"

const quoteColumns =
  "id,editor_id,client_name,client_contact,video_type,duration,level,extras,total_price,deadline,status,form_answers,pricing_breakdown,calculated_price,manual_adjustment,editor_message,finalized_at,created_at"

const legacyQuoteColumns =
  "id,editor_id,client_name,client_contact,video_type,duration,level,extras,total_price,deadline,created_at"

const legacyQuoteBodySchema = z.object({
  editorId: z.string().uuid(),
  clientName: z.string().trim().min(2, "Informe o nome do cliente."),
  clientContact: z.string().trim().min(3, "Informe um e-mail ou WhatsApp."),
  videoType: z.enum(QUOTE_VIDEO_TYPES.map((item) => item.value) as [string, ...string[]]),
  duration: z.enum(QUOTE_DURATIONS.map((item) => item.value) as [string, ...string[]]),
  level: z.enum(QUOTE_LEVELS.map((item) => item.value) as [string, ...string[]]),
  extras: z.array(z.enum(QUOTE_EXTRAS.map((item) => item.value) as [string, ...string[]])).default([]),
})

const dynamicQuoteBodySchema = z.object({
  editorId: z.string().uuid(),
  clientName: z.string().trim().min(2, "Informe o nome do cliente."),
  clientContact: z.string().trim().min(3, "Informe um e-mail ou WhatsApp."),
  categoryId: z.string().trim().min(2),
  addOnIds: z.array(z.string().trim().min(2)).default([]),
  answers: quoteAnswersSchema.default({}),
})

const manualQuoteBodySchema = z.object({
  mode: z.literal("manual"),
  clientName: z.string().trim().min(2, "Informe o nome do cliente."),
  clientContact: z.string().trim().min(3, "Informe um e-mail ou WhatsApp."),
  categoryId: z.string().trim().min(2),
  addOnIds: z.array(z.string().trim().min(2)).default([]),
  answers: quoteAnswersSchema.default({}),
  priceOverrides: z.object({
    categoryBasePrice: z.number().int().min(0).max(1_000_000).optional(),
    addOns: z.record(z.number().int().min(0).max(1_000_000)).default({}),
  }).optional(),
  manualAdjustment: z.number().int().min(-1_000_000).max(1_000_000).default(0),
  editorMessage: z.string().trim().max(600).default(""),
})

const reviewQuoteSchema = z.object({
  id: z.string().uuid(),
  manualAdjustment: z.number().int().min(-1_000_000).max(1_000_000).default(0),
  editorMessage: z.string().trim().max(600).default(""),
  status: z.enum(["draft", "finalizado"]).default("finalizado"),
})

const getObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const isMissingColumn = (error: unknown, column: string) =>
  error &&
  typeof error === "object" &&
  "message" in error &&
  String((error as { message?: string }).message).includes(column)

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAdminAuthenticatedUser(request)
    const supabase = getSupabaseAdmin()
    let quotesQuery: any = await supabase
      .from("quote_requests")
      .select(quoteColumns)
      .eq("editor_id", user.id)
      .order("created_at", { ascending: false })

    if (quotesQuery.error && (
      isMissingColumn(quotesQuery.error, "status") ||
      isMissingColumn(quotesQuery.error, "form_answers") ||
      isMissingColumn(quotesQuery.error, "manual_adjustment")
    )) {
      quotesQuery = await supabase
        .from("quote_requests")
        .select(legacyQuoteColumns)
        .eq("editor_id", user.id)
        .order("created_at", { ascending: false })
    }

    if (quotesQuery.error) {
      return NextResponse.json({ error: "Não foi possível carregar os orçamentos." }, { status: 500 })
    }

    return NextResponse.json({
      quotes: (quotesQuery.data ?? []).map((item: any) => ({
        id: item.id,
        clientName: item.client_name,
        clientContact: item.client_contact,
        videoType: item.video_type,
        duration: item.duration,
        level: item.level,
        extras: item.extras,
        calculatedPrice: Number(item.calculated_price ?? item.total_price),
        manualAdjustment: Number(item.manual_adjustment ?? 0),
        totalPrice: item.total_price,
        deadline: item.deadline,
        status: item.status ?? "draft",
        editorMessage: item.editor_message ?? "",
        finalizedAt: item.finalized_at ?? null,
        formAnswers: item.form_answers ?? {},
        pricingBreakdown: item.pricing_breakdown ?? item.extras?.pricingBreakdown ?? {},
        createdAt: item.created_at,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os orçamentos."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "quote:post", 40)
    if (rateLimitError) return rateLimitError

    const rawBody = await request.json()
    const isManualQuote = rawBody && typeof rawBody === "object" && rawBody.mode === "manual"
    const isDynamicQuote = rawBody && typeof rawBody === "object" && "categoryId" in rawBody
    const body = isManualQuote
      ? manualQuoteBodySchema.parse(rawBody)
      : isDynamicQuote
        ? dynamicQuoteBodySchema.parse(rawBody)
        : legacyQuoteBodySchema.parse(rawBody)
    const supabase = getSupabaseAdmin()
    const authenticated = isManualQuote ? await requireAdminAuthenticatedUser(request) : null
    const editorId = isManualQuote ? authenticated!.user.id : (body as z.infer<typeof dynamicQuoteBodySchema> | z.infer<typeof legacyQuoteBodySchema>).editorId

    let editorQuery = await supabase
      .from("profiles")
      .select("id,appearance_theme,quote_form_config")
      .eq("id", editorId)
      .maybeSingle()

    if (editorQuery.error && isMissingColumn(editorQuery.error, "quote_form_config")) {
      editorQuery = await supabase
        .from("profiles")
        .select("id,appearance_theme")
        .eq("id", editorId)
        .maybeSingle()
    }

    if (editorQuery.error) {
      return NextResponse.json({ error: "Não foi possível validar o editor." }, { status: 500 })
    }

    if (!editorQuery.data) {
      return NextResponse.json({ error: "Editor não encontrado." }, { status: 404 })
    }

    if (isDynamicQuote) {
      const dynamicBody = body as z.infer<typeof dynamicQuoteBodySchema> | z.infer<typeof manualQuoteBodySchema>
      const manualAdjustment = isManualQuote ? (dynamicBody as z.infer<typeof manualQuoteBodySchema>).manualAdjustment : 0
      const editorMessage = isManualQuote ? (dynamicBody as z.infer<typeof manualQuoteBodySchema>).editorMessage : ""
      const priceOverrides = isManualQuote ? (dynamicBody as z.infer<typeof manualQuoteBodySchema>).priceOverrides : undefined
      const editor = editorQuery.data
      const appearanceTheme = getObject(editor.appearance_theme)
      const quoteBuilder = normalizeQuoteBuilderConfig(
        "quote_form_config" in editor ? editor.quote_form_config ?? appearanceTheme.__quoteBuilder : appearanceTheme.__quoteBuilder
      )

      if (!isManualQuote) {
        validateQuoteAnswers(quoteBuilder, dynamicBody.answers, dynamicBody.categoryId)
      }

      const quote = calculateDynamicQuote({
        config: quoteBuilder,
        categoryId: dynamicBody.categoryId,
        addOnIds: dynamicBody.addOnIds,
        answers: dynamicBody.answers,
        priceOverrides,
      })
      const summary = summarizeQuoteSelection(quoteBuilder, dynamicBody.categoryId, dynamicBody.addOnIds)
      const safeAnswers = Object.fromEntries(
        Object.entries(dynamicBody.answers).map(([key, value]) => [
          sanitizePlainText(key),
          Array.isArray(value) ? value.map((item) => sanitizePlainText(item)) : sanitizePlainText(value),
        ])
      )

      const { data: created, error: insertError } = await supabase
        .from("quote_requests")
        .insert({
          editor_id: editorId,
          client_name: sanitizePlainText(dynamicBody.clientName),
          client_contact: `${sanitizePlainText(dynamicBody.clientContact)}\n\n${formatQuoteBreakdownForNotes(quote.breakdown)}`,
          video_type: summary.videoType,
          duration: summary.duration,
          level: summary.level,
          extras: {
            kind: "dynamic",
            addOnIds: dynamicBody.addOnIds,
            addOnLabels: quote.breakdown.addOns.map((item) => item.label),
            customPrices: priceOverrides ?? null,
            categoryLabel: summary.videoLabel,
            levelLabel: summary.levelLabel,
          },
          total_price: Math.max(0, quote.totalPrice + manualAdjustment),
          calculated_price: quote.totalPrice,
          deadline: quote.deadline,
          form_answers: safeAnswers,
          pricing_breakdown: quote.breakdown,
          manual_adjustment: manualAdjustment,
          editor_message: sanitizePlainText(editorMessage),
          status: "draft",
        })
        .select(quoteColumns)
        .single()

      if (insertError && (isMissingColumn(insertError, "form_answers") || isMissingColumn(insertError, "pricing_breakdown") || isMissingColumn(insertError, "status"))) {
        const fallbackInsert = await supabase
          .from("quote_requests")
          .insert({
            editor_id: editorId,
            client_name: sanitizePlainText(dynamicBody.clientName),
            client_contact: `${sanitizePlainText(dynamicBody.clientContact)}\n\n${formatQuoteBreakdownForNotes(quote.breakdown)}`,
            video_type: summary.videoType,
            duration: summary.duration,
            level: summary.level,
            extras: {
              kind: "dynamic",
              addOnIds: dynamicBody.addOnIds,
              answers: safeAnswers,
              pricingBreakdown: quote.breakdown,
              customPrices: priceOverrides ?? null,
              categoryLabel: summary.videoLabel,
              levelLabel: summary.levelLabel,
            },
            total_price: quote.totalPrice,
            deadline: quote.deadline,
          })
          .select("id,total_price,deadline")
          .single()

        if (fallbackInsert.error || !fallbackInsert.data) {
          return NextResponse.json({ error: "Não foi possível salvar a solicitação." }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          quoteRequest: {
            id: fallbackInsert.data.id,
            totalPrice: fallbackInsert.data.total_price,
            deadline: fallbackInsert.data.deadline,
          },
        })
      }

      if (insertError || !created) {
        return NextResponse.json({ error: "Não foi possível salvar a solicitação." }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        quoteRequest: {
          id: created.id,
          totalPrice: created.total_price,
          deadline: created.deadline,
        },
      })
    }

    const legacyBody = body as z.infer<typeof legacyQuoteBodySchema>
    const extrasState = defaultQuoteExtras()
    legacyBody.extras.forEach((extra) => {
      extrasState[extra as QuoteExtra] = true
    })

    const quote = calculateQuote({
      videoType: legacyBody.videoType as QuoteVideoType,
      duration: legacyBody.duration as QuoteDuration,
      level: legacyBody.level as QuoteLevel,
      extras: extrasState,
    })

    const { data: created, error: insertError } = await supabase
      .from("quote_requests")
      .insert({
        editor_id: legacyBody.editorId,
        client_name: sanitizePlainText(legacyBody.clientName),
        client_contact: sanitizePlainText(legacyBody.clientContact),
        video_type: legacyBody.videoType,
        duration: legacyBody.duration,
        level: legacyBody.level,
        extras: extrasState,
        total_price: quote.totalPrice,
        deadline: quote.deadline,
      })
      .select("id,total_price,deadline")
      .single()

    if (insertError || !created) {
      return NextResponse.json({ error: "Não foi possível salvar a solicitação." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      quoteRequest: {
        id: created.id,
        totalPrice: created.total_price,
        deadline: created.deadline,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }

    return NextResponse.json({ error: "Não foi possível enviar a solicitação." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "quote:patch", 60)
    if (rateLimitError) return rateLimitError

    const { user } = await requireAdminAuthenticatedUser(request)
    const body = reviewQuoteSchema.parse(await request.json())
    const supabase = getSupabaseAdmin()

    const { data: existing, error: existingError } = await supabase
      .from("quote_requests")
      .select("id,editor_id,total_price,calculated_price")
      .eq("id", body.id)
      .eq("editor_id", user.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: "Não foi possível carregar o orçamento." }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 })
    }

    const calculatedPrice = Number(existing.calculated_price ?? existing.total_price)
    const finalPrice = Math.max(0, calculatedPrice + body.manualAdjustment)
    const finalizedAt = body.status === "finalizado" ? new Date().toISOString() : null

    const { data, error } = await supabase
      .from("quote_requests")
      .update({
        total_price: finalPrice,
        manual_adjustment: body.manualAdjustment,
        editor_message: sanitizePlainText(body.editorMessage),
        status: body.status,
        finalized_at: finalizedAt,
      })
      .eq("id", body.id)
      .eq("editor_id", user.id)
      .select(quoteColumns)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Não foi possível finalizar o orçamento." }, { status: 500 })
    }

    return NextResponse.json({
      quote: {
        id: data.id,
        totalPrice: data.total_price,
        calculatedPrice: data.calculated_price ?? calculatedPrice,
        manualAdjustment: data.manual_adjustment ?? body.manualAdjustment,
        status: data.status,
        editorMessage: data.editor_message ?? "",
        finalizedAt: data.finalized_at,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Orçamento inválido." }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Não foi possível finalizar o orçamento."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
