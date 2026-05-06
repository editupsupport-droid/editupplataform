export const QUOTE_VIDEO_TYPES = [
  { value: "reels", label: "Reels / TikTok", basePrice: 90, baseDays: 2 },
  { value: "podcast", label: "Corte de podcast", basePrice: 150, baseDays: 3 },
  { value: "youtube", label: "YouTube", basePrice: 230, baseDays: 4 },
  { value: "institucional", label: "Institucional / anúncio", basePrice: 320, baseDays: 5 },
] as const

export const QUOTE_DURATIONS = [
  { value: "ate-30s", label: "Até 30 segundos", price: 0, days: 0 },
  { value: "31-60s", label: "31 a 60 segundos", price: 60, days: 1 },
  { value: "1-3min", label: "1 a 3 minutos", price: 130, days: 1 },
  { value: "3-5min", label: "3 a 5 minutos", price: 210, days: 2 },
  { value: "5-10min", label: "5 a 10 minutos", price: 320, days: 3 },
] as const

export const QUOTE_LEVELS = [
  { value: "essencial", label: "Essencial", price: 0, days: 0 },
  { value: "profissional", label: "Profissional", price: 120, days: 1 },
  { value: "premium", label: "Premium", price: 240, days: 2 },
] as const

export const QUOTE_EXTRAS = [
  { value: "legenda", label: "Legenda", price: 40, days: 1 },
  { value: "motion", label: "Motion", price: 90, days: 1 },
  { value: "thumb", label: "Thumb", price: 35, days: 0 },
] as const

export type QuoteVideoType = (typeof QUOTE_VIDEO_TYPES)[number]["value"]
export type QuoteDuration = (typeof QUOTE_DURATIONS)[number]["value"]
export type QuoteLevel = (typeof QUOTE_LEVELS)[number]["value"]
export type QuoteExtra = (typeof QUOTE_EXTRAS)[number]["value"]

export type QuoteExtrasState = Record<QuoteExtra, boolean>

export const defaultQuoteExtras = (): QuoteExtrasState => ({
  legenda: false,
  motion: false,
  thumb: false,
})

const DAY_LABELS: Record<number, string> = {
  1: "1 dia útil",
}

export const formatQuoteDeadline = (days: number) => DAY_LABELS[days] ?? `${days} dias úteis`

export const formatQuoteCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)

export const getQuoteStartingPrice = () =>
  Math.min(...QUOTE_VIDEO_TYPES.map((item) => item.basePrice))

export const calculateQuote = ({
  videoType,
  duration,
  level,
  extras,
}: {
  videoType: QuoteVideoType
  duration: QuoteDuration
  level: QuoteLevel
  extras: QuoteExtrasState
}) => {
  const selectedType = QUOTE_VIDEO_TYPES.find((item) => item.value === videoType) ?? QUOTE_VIDEO_TYPES[0]
  const selectedDuration = QUOTE_DURATIONS.find((item) => item.value === duration) ?? QUOTE_DURATIONS[0]
  const selectedLevel = QUOTE_LEVELS.find((item) => item.value === level) ?? QUOTE_LEVELS[0]

  const selectedExtras = QUOTE_EXTRAS.filter((item) => extras[item.value])
  const extrasPrice = selectedExtras.reduce((total, item) => total + item.price, 0)
  const extrasDays = selectedExtras.reduce((total, item) => total + item.days, 0)

  const totalPrice = selectedType.basePrice + selectedDuration.price + selectedLevel.price + extrasPrice
  const totalDays = selectedType.baseDays + selectedDuration.days + selectedLevel.days + extrasDays

  return {
    totalPrice,
    deadline: formatQuoteDeadline(totalDays),
  }
}

export const quoteChoices = {
  videoTypes: QUOTE_VIDEO_TYPES,
  durations: QUOTE_DURATIONS,
  levels: QUOTE_LEVELS,
  extras: QUOTE_EXTRAS,
}
