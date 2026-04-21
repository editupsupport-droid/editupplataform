import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
let pendingAccessTokenPromise: Promise<string | null> | null = null
const AUTH_TIMEOUT_MS = 15000

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error("Supabase ainda não foi configurado neste projeto.")
  }

  return supabase
}

export const getSupabaseAccessToken = async () => {
  if (pendingAccessTokenPromise) {
    return pendingAccessTokenPromise
  }

  pendingAccessTokenPromise = (async () => {
    if (!supabase) return null

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      return session.access_token
    }

    const refreshed = await supabase.auth.refreshSession()
    return refreshed.data.session?.access_token ?? null
  })()

  try {
    return await pendingAccessTokenPromise
  } finally {
    pendingAccessTokenPromise = null
  }
}

const buildAuthedRequest = (token: string, input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${token}`)

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)
  const signal = init.signal

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true })
  }

  return fetch(input, {
    ...init,
    cache: "no-store",
    headers,
    signal: controller.signal,
  }).finally(() => {
    window.clearTimeout(timeoutId)
  })
}

export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  let token: string | null

  try {
    token = await getSupabaseAccessToken()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Não foi possível validar sua sessão. Faça login novamente.")
  }

  if (!token) {
    throw new Error("Sua sessão não foi encontrada. Faça login novamente.")
  }

  let firstResponse: Response

  try {
    firstResponse = await buildAuthedRequest(token, input, init)
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A requisição demorou demais. Tente novamente.")
    }
    throw error
  }

  if (firstResponse.status !== 401 || !supabase) {
    return firstResponse
  }

  const refreshed = await supabase.auth.refreshSession()
  const refreshedToken = refreshed.data.session?.access_token

  if (!refreshedToken) {
    return firstResponse
  }

  try {
    return await buildAuthedRequest(refreshedToken, input, init)
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A requisição demorou demais. Tente novamente.")
    }
    throw error
  }
}
