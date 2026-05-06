"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { AppCurrency, AppLanguage, formatCurrency as formatCurrencyValue } from "@/lib/intl"
import {
  AppearanceTheme,
  applyAppearanceTheme,
  builtInAppearanceThemes,
  normalizeAppearanceTheme,
} from "@/lib/appearance"
import { authFetch, supabase } from "@/lib/supabase"

const messages = {
  pt: {
    dashboard: "Hoje",
    clients: "Clientes",
    schedule: "Produção",
    notifications: "Notificações",
    quotes: "Propostas",
    finance: "Receita",
    calculator: "Calculadora",
    jobs: "Vagas",
    pack: "Pack de Edição",
    exchange: "Trocas",
    drive: "Drive",
    reelsCourse: "Curso de Reels",
    outreach: "Prospecção",
    community: "Comunidade",
    plans: "Planos",
    profile: "Perfil",
    settings: "Configurações",
    editorWorkspace: "Workspace do editor",
    language: "Idioma",
    currency: "Moeda",
    preferences: "Preferências",
    logout: "Sair",
    product: "Produto",
    legal: "Legal",
    features: "Recursos",
    pricing: "Planos",
    testimonials: "Depoimentos",
    terms: "Termos de uso",
    privacy: "Política de privacidade",
    contact: "Contato",
    footerDescription: "Uma plataforma completa para editores de vídeo que querem crescer profissionalmente e aumentar sua renda.",
    rightsReserved: "Todos os direitos reservados.",
    rejected: "Desaprovado",
    approved: "Aprovado",
    pendingResponse: "Aguardando resposta",
    completed: "Concluído",
    inProduction: "Em produção",
    scheduled: "Agendado",
  },
  en: {
    dashboard: "Today",
    clients: "Clients",
    schedule: "Production",
    notifications: "Notifications",
    quotes: "Proposals",
    finance: "Revenue",
    calculator: "Calculator",
    jobs: "Jobs",
    pack: "Editing Pack",
    exchange: "Exchange",
    drive: "Drive",
    reelsCourse: "Reels Course",
    outreach: "Outreach",
    community: "Comunidade",
    plans: "Planos",
    profile: "Profile",
    settings: "Settings",
    editorWorkspace: "Editor workspace",
    language: "Language",
    currency: "Currency",
    preferences: "Preferences",
    logout: "Sair",
    product: "Product",
    legal: "Legal",
    features: "Features",
    pricing: "Pricing",
    testimonials: "Testimonials",
    terms: "Terms of use",
    privacy: "Privacy policy",
    contact: "Contact",
    footerDescription: "A complete platform for video editors who want to grow professionally and increase their income.",
    rightsReserved: "All rights reserved.",
    rejected: "Rejected",
    approved: "Approved",
    pendingResponse: "Waiting for response",
    completed: "Completed",
    inProduction: "In production",
    scheduled: "Scheduled",
  },
  es: {
    dashboard: "Hoy",
    clients: "Clientes",
    schedule: "Producción",
    notifications: "Notificaciones",
    quotes: "Propuestas",
    finance: "Ingresos",
    calculator: "Calculadora",
    jobs: "Vacantes",
    pack: "Pack de Edición",
    exchange: "Exchange",
    drive: "Drive",
    reelsCourse: "Curso de Reels",
    outreach: "Prospección",
    community: "Comunidad",
    plans: "Planes",
    profile: "Perfil",
    settings: "Configuración",
    editorWorkspace: "Workspace del editor",
    language: "Idioma",
    currency: "Moneda",
    preferences: "Preferencias",
    logout: "Salir",
    product: "Producto",
    legal: "Legal",
    features: "Recursos",
    pricing: "Planes",
    testimonials: "Testimonios",
    terms: "Términos de uso",
    privacy: "Política de privacidad",
    contact: "Contacto",
    footerDescription: "Una plataforma completa para editores de video que quieren crecer profesionalmente y aumentar sus ingresos.",
    rightsReserved: "Todos los derechos reservados.",
    rejected: "Desaprobado",
    approved: "Aprobado",
    pendingResponse: "Esperando respuesta",
    completed: "Completado",
    inProduction: "En producción",
    scheduled: "Agendado",
  },
} as const

type MessageKey = keyof (typeof messages)["pt"]

type AppPreferencesContextValue = {
  language: AppLanguage
  currency: AppCurrency
  theme: AppearanceTheme
  savedThemes: AppearanceTheme[]
  monthlyRevenueGoal: number
  setLanguage: (language: AppLanguage) => void
  setCurrency: (currency: AppCurrency) => void
  setTheme: (theme: AppearanceTheme) => void
  setMonthlyRevenueGoal: (value: number) => void
  saveTheme: (theme: AppearanceTheme) => void
  deleteSavedTheme: (themeId: string) => void
  t: (key: MessageKey) => string
  formatCurrency: (value: number, currencyOverride?: AppCurrency, options?: Intl.NumberFormatOptions) => string
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(undefined)

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>("pt")
  const [currency, setCurrency] = useState<AppCurrency>("BRL")
  const [theme, setThemeState] = useState<AppearanceTheme>(builtInAppearanceThemes[0])
  const [savedThemes, setSavedThemes] = useState<AppearanceTheme[]>([])
  const [monthlyRevenueGoal, setMonthlyRevenueGoalState] = useState(5000)

  useEffect(() => {
    applyAppearanceTheme(builtInAppearanceThemes[0])
    let cancelled = false

    const syncPreferences = async () => {
      try {
        const response = await authFetch("/api/preferences")
        if (!response.ok || cancelled) return
        const payload = (await response.json().catch(() => ({}))) as {
          preferences?: {
            language?: AppLanguage
            theme?: AppearanceTheme | null
            monthlyRevenueGoal?: number
          }
        }
        if (payload.preferences?.language) {
          setLanguage(payload.preferences.language)
        }
        if (payload.preferences?.theme) {
          setThemeState(normalizeAppearanceTheme(payload.preferences.theme))
        }
        if (typeof payload.preferences?.monthlyRevenueGoal === "number") {
          setMonthlyRevenueGoalState(payload.preferences.monthlyRevenueGoal)
        }
      } catch {
        // Anonymous visitors keep the in-memory defaults.
      }
    }

    void syncPreferences()
    const { data: authListener } =
      supabase?.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          void syncPreferences()
        }
      }) ?? { data: { subscription: null } }

    return () => {
      cancelled = true
      authListener.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    applyAppearanceTheme(theme)
  }, [theme])

  const persistPreferences = async (updates: { language?: AppLanguage; theme?: AppearanceTheme; monthlyRevenueGoal?: number }) => {
    try {
      await authFetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
    } catch (error) {
      console.error(error)
    }
  }

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      language,
      currency,
      theme,
      savedThemes,
      monthlyRevenueGoal,
      setLanguage: (nextLanguage) => {
        setLanguage(nextLanguage)
        void persistPreferences({ language: nextLanguage })
      },
      setCurrency: (nextCurrency) => {
        setCurrency(nextCurrency)
      },
      setTheme: (nextTheme) => {
        const normalized = normalizeAppearanceTheme(nextTheme)
        setThemeState(normalized)
        void persistPreferences({ theme: normalized })
      },
      setMonthlyRevenueGoal: (nextValue) => {
        const normalized = Math.max(0, Number(nextValue) || 0)
        setMonthlyRevenueGoalState(normalized)
        void persistPreferences({ monthlyRevenueGoal: normalized })
      },
      saveTheme: (nextTheme) => {
        const normalized = normalizeAppearanceTheme(nextTheme)
        setThemeState(normalized)
        void persistPreferences({ theme: normalized })
        setSavedThemes((current) => {
          const withoutSameId = current.filter((item) => item.id !== normalized.id)
          return [normalized, ...withoutSameId].slice(0, 12)
        })
      },
      deleteSavedTheme: (themeId) => {
        setSavedThemes((current) => current.filter((item) => item.id !== themeId))
      },
      t: (key) => messages[language][key],
      formatCurrency: (valueToFormat, currencyOverride, options) =>
        formatCurrencyValue(valueToFormat, currencyOverride ?? currency, language, options),
    }),
    [currency, language, monthlyRevenueGoal, savedThemes, theme]
  )

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
}

export const useAppPreferences = () => {
  const context = useContext(AppPreferencesContext)

  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider")
  }

  return context
}
