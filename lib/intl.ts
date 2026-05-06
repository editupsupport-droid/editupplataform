export type AppLanguage = "pt" | "en" | "es"
export type AppCurrency = "BRL" | "USD" | "EUR"

const localeByLanguage: Record<AppLanguage, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
}

export const getLocaleFromLanguage = (language: AppLanguage) => localeByLanguage[language]

export const formatCurrency = (
  value: number,
  currency: AppCurrency,
  language: AppLanguage = "pt",
  options?: Intl.NumberFormatOptions
) =>
  new Intl.NumberFormat(getLocaleFromLanguage(language), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(value)

export const formatDateTime = (
  value: string | number | Date,
  language: AppLanguage = "pt",
  options?: Intl.DateTimeFormatOptions
) =>
  new Intl.DateTimeFormat(getLocaleFromLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(new Date(value))
