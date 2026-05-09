import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type RateBucket = { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateBucket>()

export const normalizeSupabaseUrl = (value?: string) => {
  if (!value) return undefined

  try {
    const url = new URL(value.trim().replace(/^['"]|['"]$/g, ""))
    return url.origin
  } catch {
    return value
  }
}

export const getSupabaseAdmin = () => {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin não configurado.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export const requireAdminAuthenticatedUser = async (request: NextRequest) => {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Não autenticado.")
  }

  const token = authorization.slice("Bearer ".length).trim()
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    throw new Error("Não autenticado.")
  }

  return { supabase, user: data.user }
}

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin
  } catch {
    return ""
  }
}

export const ensureSameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const candidateOrigin = origin ? normalizeOrigin(origin) : referer ? normalizeOrigin(referer) : ""

  if (!candidateOrigin) {
    return NextResponse.json({ error: "Origem da requisição não pôde ser validada." }, { status: 403 })
  }

  if (candidateOrigin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 })
  }

  return null
}

export const enforceApiRateLimit = (request: NextRequest, scope: string, max = 100) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const key = `${scope}:${forwardedFor || request.headers.get("x-real-ip") || "unknown"}`
  const now = Date.now()
  const current = rateLimitStore.get(key)

  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return null
  }

  if (current.count >= max) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em alguns minutos." }, { status: 429 })
  }

  current.count += 1
  rateLimitStore.set(key, current)
  return null
}

export const sanitizePlainText = (value: string) => value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim()

export const sanitizeOptionalPlainText = (value: string | null | undefined) => (value ? sanitizePlainText(value) : "")

export const isSafeHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:")
  } catch {
    return false
  }
}
