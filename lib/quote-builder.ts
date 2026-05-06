import { z } from "zod"
import { formatQuoteCurrency, formatQuoteDeadline } from "@/lib/quote-config"
import { sanitizePlainText } from "@/lib/security"

export const quoteQuestionTypes = ["short-text", "long-text", "multi-select", "upload-reference"] as const
export const quoteMultiplierOperators = ["equals", "not_equals", "contains", "gt", "gte", "lt", "lte"] as const

export type QuoteQuestionType = (typeof quoteQuestionTypes)[number]
export type QuoteMultiplierOperator = (typeof quoteMultiplierOperators)[number]

export type QuoteQuestion = {
  id: string
  label: string
  type: QuoteQuestionType
  required: boolean
  placeholder?: string
  options?: string[]
  conditional?: {
    questionId: string
    operator: "equals" | "contains"
    value: string
  }
}

export type QuotePriceCategory = {
  id: string
  label: string
  description?: string
  basePrice: number
  baseDays: number
}

export type QuoteAddOn = {
  id: string
  label: string
  description?: string
  price: number
  days: number
}

export type QuoteMultiplier = {
  id: string
  label: string
  questionId: string
  operator: QuoteMultiplierOperator
  value: string
  multiplier: number
}

export type QuoteMinutePricing = {
  enabled: boolean
  questionId: string
  includedMinutes: number
  pricePerExtraMinute: number
}

export type QuotePreset = {
  id: string
  label: string
  description?: string
  categoryId: string
  addOnIds: string[]
  answers?: QuoteAnswers
  manualAdjustment?: number
  clientMessage?: string
}

export type QuoteBuilderConfig = {
  version: number
  introTitle: string
  introDescription: string
  questions: QuoteQuestion[]
  categories: QuotePriceCategory[]
  addOns: QuoteAddOn[]
  minutePricing: QuoteMinutePricing
  multipliers: QuoteMultiplier[]
  presets: QuotePreset[]
}

export type QuoteAnswers = Record<string, string | string[]>

export const createQuoteId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`

export const defaultQuoteBuilderConfig: QuoteBuilderConfig = {
  version: 1,
  introTitle: "Monte seu orçamento",
  introDescription: "Responda o briefing e veja uma estimativa transparente em tempo real.",
  questions: [
    {
      id: "instagram",
      label: "Qual seu Instagram?",
      type: "short-text",
      required: false,
      placeholder: "@seuperfil",
    },
    {
      id: "objetivo",
      label: "Qual é o objetivo principal do vídeo?",
      type: "long-text",
      required: true,
      placeholder: "Ex: lançamento, autoridade, anúncio, conteúdo orgânico...",
    },
    {
      id: "minutos-video",
      label: "Quantos minutos terá o vídeo final?",
      type: "short-text",
      required: true,
      placeholder: "Ex: 1, 3, 8",
    },
    {
      id: "estilo-reels",
      label: "Qual estilo de edição você quer para Reels/Shorts?",
      type: "multi-select",
      required: false,
      options: ["Dinâmico", "Clean", "Infoproduto", "Cinemático"],
      conditional: { questionId: "__category", operator: "equals", value: "reels" },
    },
    {
      id: "referencias",
      label: "Envie links de referências ou arquivos",
      type: "upload-reference",
      required: false,
      placeholder: "Cole links do Drive, YouTube, Instagram ou WeTransfer.",
    },
  ],
  categories: [
    { id: "simples", label: "Edição simples", description: "Cortes, ritmo e limpeza básica.", basePrice: 50, baseDays: 3 },
    { id: "pro", label: "Edição Pro", description: "Narrativa, motion leve e acabamento comercial.", basePrice: 120, baseDays: 5 },
    { id: "reels", label: "Reels / Shorts", description: "Vertical, rápido e pronto para retenção.", basePrice: 70, baseDays: 2 },
  ],
  addOns: [
    { id: "thumbnail", label: "Thumbnail", description: "Criação de capa/thumbnail para publicação.", price: 35, days: 1 },
    { id: "expressa", label: "Entrega em 24h", description: "Prioridade na fila de produção.", price: 30, days: 0 },
    { id: "trilha", label: "Pesquisa de trilha", description: "Curadoria de trilhas e efeitos sonoros.", price: 30, days: 1 },
  ],
  minutePricing: {
    enabled: true,
    questionId: "minutos-video",
    includedMinutes: 1,
    pricePerExtraMinute: 20,
  },
  multipliers: [],
  presets: [
    {
      id: "infoprodutos",
      label: "Infoprodutos",
      description: "Vídeo de vendas com thumbnail e trilha.",
      categoryId: "pro",
      addOnIds: ["thumbnail", "trilha"],
      answers: { objetivo: "Vídeo de vendas para campanha ou lançamento.", "minutos-video": "3" },
    },
    {
      id: "eventos",
      label: "Eventos",
      description: "Pacote rápido para entrega com prioridade.",
      categoryId: "simples",
      addOnIds: ["expressa"],
      answers: { objetivo: "Edição de evento com prazo enxuto.", "minutos-video": "2" },
    },
  ],
}

const trimText = (value: string) => sanitizePlainText(value).slice(0, 280)

const questionSchema = z.object({
  id: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().trim().min(2).max(160).transform(trimText),
  type: z.enum(quoteQuestionTypes),
  required: z.boolean(),
  placeholder: z.string().trim().max(220).optional().transform((value) => value ? trimText(value) : value),
  options: z.array(z.string().trim().min(1).max(80).transform(trimText)).max(12).optional(),
  conditional: z.object({
    questionId: z.string().trim().min(2).max(80),
    operator: z.enum(["equals", "contains"]),
    value: z.string().trim().min(1).max(120).transform(trimText),
  }).optional(),
})

export const quoteAnswersSchema = z.record(
  z.union([
    z.string().trim().max(1500).transform(trimText),
    z.array(z.string().trim().min(1).max(180).transform(trimText)).max(12),
  ])
)

export const quoteBuilderConfigSchema = z.object({
  version: z.number().int().min(1).default(1),
  introTitle: z.string().trim().min(2).max(120).transform(trimText),
  introDescription: z.string().trim().min(2).max(260).transform(trimText),
  questions: z.array(questionSchema).min(1).max(24),
  categories: z.array(z.object({
    id: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    label: z.string().trim().min(2).max(120).transform(trimText),
    description: z.string().trim().max(180).optional().transform((value) => value ? trimText(value) : value),
    basePrice: z.number().int().min(0).max(1_000_000),
    baseDays: z.number().int().min(0).max(90),
  })).min(1).max(16),
  addOns: z.array(z.object({
    id: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    label: z.string().trim().min(2).max(120).transform(trimText),
    description: z.string().trim().max(180).optional().transform((value) => value ? trimText(value) : value),
    price: z.number().int().min(0).max(1_000_000),
    days: z.number().int().min(0).max(90),
  })).max(24),
  minutePricing: z.object({
    enabled: z.boolean().default(true),
    questionId: z.string().trim().min(2).max(80).default("minutos-video"),
    includedMinutes: z.number().int().min(0).max(10_000).default(1),
    pricePerExtraMinute: z.number().int().min(0).max(1_000_000).default(20),
  }).default(defaultQuoteBuilderConfig.minutePricing),
  multipliers: z.array(z.object({
    id: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    label: z.string().trim().min(2).max(120).transform(trimText),
    questionId: z.string().trim().min(2).max(80),
    operator: z.enum(quoteMultiplierOperators),
    value: z.string().trim().min(1).max(120).transform(trimText),
    multiplier: z.number().min(0.1).max(20),
  })).max(16),
  presets: z.array(z.object({
    id: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    label: z.string().trim().min(2).max(120).transform(trimText),
    description: z.string().trim().max(220).optional().transform((value) => value ? trimText(value) : value),
    categoryId: z.string().trim().min(2).max(80),
    addOnIds: z.array(z.string().trim().min(2).max(80)).max(24),
    answers: quoteAnswersSchema.optional(),
    manualAdjustment: z.number().int().min(-1_000_000).max(1_000_000).optional(),
    clientMessage: z.string().trim().max(600).optional().transform((value) => value ? trimText(value) : value),
  })).max(12),
})

const upsertById = <T extends { id: string }>(items: T[], replacement: T, shouldReplace: (item: T) => boolean = () => true) => {
  const index = items.findIndex((item) => item.id === replacement.id)
  if (index >= 0) {
    if (shouldReplace(items[index])) items[index] = { ...items[index], ...replacement }
    return items
  }
  return [...items, replacement]
}

const migrateQuoteBuilderConfig = (config: QuoteBuilderConfig): QuoteBuilderConfig => {
  let categories = config.categories.filter((category) => category.id !== "youtube")
  categories = upsertById(categories, defaultQuoteBuilderConfig.categories[0], (item) => item.basePrice === 200)
  categories = upsertById(categories, defaultQuoteBuilderConfig.categories[1], (item) => item.basePrice === 500)
  categories = upsertById(categories, defaultQuoteBuilderConfig.categories[2], (item) => item.basePrice === 180)

  let addOns = config.addOns.filter((addOn) => addOn.id !== "legendas")
  addOns = upsertById(addOns, defaultQuoteBuilderConfig.addOns[0], () => false)
  addOns = upsertById(addOns, defaultQuoteBuilderConfig.addOns[1], (item) => item.price === 100)
  addOns = upsertById(addOns, defaultQuoteBuilderConfig.addOns[2], () => false)

  let questions = config.questions
    .filter((question) => question.id !== "duracao-youtube" && question.id !== "estilo-legendas")
    .map((question) => {
      if (question.conditional?.value === "youtube") return { ...question, conditional: undefined }
      return question
    })
  const minuteQuestion = defaultQuoteBuilderConfig.questions.find((question) => question.id === "minutos-video")
  const reelsQuestion = defaultQuoteBuilderConfig.questions.find((question) => question.id === "estilo-reels")
  if (minuteQuestion) questions = upsertById(questions, minuteQuestion, () => false)
  if (reelsQuestion) questions = upsertById(questions, reelsQuestion, () => false)

  const multipliers = config.multipliers.filter((rule) => rule.id !== "youtube-longo" && rule.questionId !== "duracao-youtube")
  const presets = config.presets.map((preset) => ({
    ...preset,
    categoryId: preset.categoryId === "youtube" ? "pro" : preset.categoryId,
    addOnIds: preset.addOnIds.filter((id) => id !== "legendas").map((id) => id === "youtube" ? "pro" : id),
    answers: preset.answers
      ? Object.fromEntries(Object.entries(preset.answers).filter(([key]) => key !== "duracao-youtube" && key !== "estilo-legendas"))
      : preset.answers,
  }))

  return {
    ...config,
    questions,
    categories,
    addOns,
    minutePricing: config.minutePricing ?? defaultQuoteBuilderConfig.minutePricing,
    multipliers,
    presets,
  }
}

export const normalizeQuoteBuilderConfig = (value: unknown): QuoteBuilderConfig => {
  const parsed = quoteBuilderConfigSchema.safeParse(value)
  return parsed.success ? migrateQuoteBuilderConfig(parsed.data) : defaultQuoteBuilderConfig
}

export const getQuoteStartingPriceFromConfig = (config: QuoteBuilderConfig) =>
  Math.min(...config.categories.map((item) => item.basePrice))

const getAnswerValue = (answers: QuoteAnswers, questionId: string, categoryId: string) =>
  questionId === "__category" ? categoryId : answers[questionId]

const answerMatches = (answer: string | string[] | undefined, operator: QuoteMultiplierOperator | "equals" | "contains", expected: string) => {
  const values = Array.isArray(answer) ? answer : [answer ?? ""]
  const normalizedExpected = expected.toLocaleLowerCase("pt-BR")
  const normalizedValues = values.map((value) => String(value).toLocaleLowerCase("pt-BR"))
  const numericAnswer = Number(normalizedValues[0]?.replace(",", "."))
  const numericExpected = Number(normalizedExpected.replace(",", "."))

  if (operator === "equals") return normalizedValues.includes(normalizedExpected)
  if (operator === "not_equals") return !normalizedValues.includes(normalizedExpected)
  if (operator === "contains") return normalizedValues.some((value) => value.includes(normalizedExpected))
  if (Number.isNaN(numericAnswer) || Number.isNaN(numericExpected)) return false
  if (operator === "gt") return numericAnswer > numericExpected
  if (operator === "gte") return numericAnswer >= numericExpected
  if (operator === "lt") return numericAnswer < numericExpected
  if (operator === "lte") return numericAnswer <= numericExpected
  return false
}

const parseMinuteAnswer = (answer: string | string[] | undefined) => {
  const raw = Array.isArray(answer) ? answer[0] : answer
  const match = String(raw ?? "").replace(",", ".").match(/\d+(\.\d+)?/)
  if (!match) return 0
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? Math.max(0, Math.ceil(parsed)) : 0
}

export const isQuoteQuestionVisible = (question: QuoteQuestion, answers: QuoteAnswers, categoryId: string) => {
  if (!question.conditional) return true
  return answerMatches(
    getAnswerValue(answers, question.conditional.questionId, categoryId),
    question.conditional.operator,
    question.conditional.value
  )
}

export const calculateDynamicQuote = ({
  config,
  categoryId,
  addOnIds,
  answers,
  priceOverrides,
}: {
  config: QuoteBuilderConfig
  categoryId: string
  addOnIds: string[]
  answers: QuoteAnswers
  priceOverrides?: {
    categoryBasePrice?: number
    addOns?: Record<string, number>
  }
}) => {
  const category = config.categories.find((item) => item.id === categoryId) ?? config.categories[0]
  const selectedAddOns = config.addOns.filter((item) => addOnIds.includes(item.id))
  const uniqueAddOns = [...new Map(selectedAddOns.map((item) => [
    item.id,
    {
      ...item,
      price: priceOverrides?.addOns?.[item.id] ?? item.price,
    },
  ])).values()]
  const categoryPrice = priceOverrides?.categoryBasePrice ?? category.basePrice
  const addOnsPrice = uniqueAddOns.reduce((total, item) => total + item.price, 0)
  const addOnsDays = uniqueAddOns.reduce((total, item) => total + item.days, 0)
  const minuteConfig = config.minutePricing
  const minutes = minuteConfig?.enabled ? parseMinuteAnswer(answers[minuteConfig.questionId]) : 0
  const extraMinutes = minuteConfig?.enabled
    ? Math.max(0, minutes - minuteConfig.includedMinutes)
    : 0
  const minutePrice = extraMinutes * (minuteConfig?.pricePerExtraMinute ?? 0)
  const appliedMultipliers = config.multipliers.filter((item) =>
    answerMatches(getAnswerValue(answers, item.questionId, category.id), item.operator, item.value)
  )
  const multiplier = appliedMultipliers.reduce((total, item) => total * item.multiplier, 1)
  const subtotal = categoryPrice + addOnsPrice + minutePrice
  const totalPrice = Math.round(subtotal * multiplier)
  const totalDays = Math.max(1, category.baseDays + addOnsDays)

  return {
    totalPrice,
    deadline: formatQuoteDeadline(totalDays),
    breakdown: {
      category: { id: category.id, label: category.label, price: categoryPrice },
      addOns: uniqueAddOns.map((item) => ({ id: item.id, label: item.label, price: item.price })),
      minutePricing: minuteConfig?.enabled ? {
        minutes,
        includedMinutes: minuteConfig.includedMinutes,
        extraMinutes,
        pricePerExtraMinute: minuteConfig.pricePerExtraMinute,
        price: minutePrice,
      } : undefined,
      multipliers: appliedMultipliers.map((item) => ({ id: item.id, label: item.label, multiplier: item.multiplier })),
      subtotal,
      multiplier,
      totalPrice,
      deadline: formatQuoteDeadline(totalDays),
    },
  }
}

export const validateQuoteAnswers = (config: QuoteBuilderConfig, answers: QuoteAnswers, categoryId: string) => {
  const missing = config.questions.find((question) => {
    if (!question.required || !isQuoteQuestionVisible(question, answers, categoryId)) return false
    const value = answers[question.id]
    return Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim()
  })

  if (missing) {
    throw new Error(`Preencha: ${missing.label}`)
  }
}

export const summarizeQuoteSelection = (config: QuoteBuilderConfig, categoryId: string, addOnIds: string[]) => {
  const category = config.categories.find((item) => item.id === categoryId) ?? config.categories[0]
  const addOns = config.addOns.filter((item) => addOnIds.includes(item.id))
  return {
    videoType: category.id,
    videoLabel: category.label,
    duration: "custom",
    durationLabel: "Briefing personalizado",
    level: "custom",
    levelLabel: addOns.length ? addOns.map((item) => item.label).join(", ") : "Sem adicionais",
  }
}

export const formatQuoteBreakdownForNotes = (breakdown: ReturnType<typeof calculateDynamicQuote>["breakdown"]) => {
  const addOns = breakdown.addOns.length ? breakdown.addOns.map((item) => `${item.label} (+${formatQuoteCurrency(item.price)})`).join(", ") : "Sem adicionais"
  const minutes = breakdown.minutePricing && breakdown.minutePricing.minutes > 0
    ? `\nMinutos: ${breakdown.minutePricing.minutes} min (${breakdown.minutePricing.extraMinutes} extras, +${formatQuoteCurrency(breakdown.minutePricing.price)})`
    : ""
  const multipliers = breakdown.multipliers.length ? breakdown.multipliers.map((item) => `${item.label} (${item.multiplier}x)`).join(", ") : "Sem multiplicadores"
  return `Categoria: ${breakdown.category.label}\nAdicionais: ${addOns}${minutes}\nMultiplicadores: ${multipliers}`
}
