import { NextRequest, NextResponse } from "next/server"
import DOMPurify from "isomorphic-dompurify"
import { getSiteUrl } from "@/lib/site-url"

type RateBucket = { count: number; resetAt: number }

const globalRateLimitStore = new Map<string, RateBucket>()

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin
  } catch {
    return ""
  }
}

export const getAllowedOrigins = (request?: NextRequest) => {
  const origins = new Set<string>()
  const configuredSiteUrl = normalizeOrigin(getSiteUrl())

  if (configuredSiteUrl) {
    origins.add(configuredSiteUrl)
  }

  if (process.env.NODE_ENV !== "production" && request?.nextUrl?.origin) {
    origins.add(request.nextUrl.origin)
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000")
    origins.add("http://127.0.0.1:3000")
    origins.add("http://192.168.0.214:3000")
  }

  return origins
}

export const ensureTrustedOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const candidateOrigin = origin ? normalizeOrigin(origin) : referer ? normalizeOrigin(referer) : ""

  if (!candidateOrigin) {
    return NextResponse.json({ error: "Origem da requisição não pôde ser validada." }, { status: 403 })
  }

  if (!getAllowedOrigins(request).has(candidateOrigin)) {
    return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 })
  }

  return null
}

export const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwardedFor || request.headers.get("x-real-ip") || "unknown"
}

export const consumeRateLimit = ({
  key,
  windowMs,
  max,
}: {
  key: string
  windowMs: number
  max: number
}) => {
  const now = Date.now()
  const current = globalRateLimitStore.get(key)

  if (!current || now > current.resetAt) {
    globalRateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (current.count >= max) {
    return false
  }

  current.count += 1
  globalRateLimitStore.set(key, current)
  return true
}

export const enforceRateLimit = (
  request: NextRequest,
  {
    scope,
    windowMs = 15 * 60 * 1000,
    max = 100,
  }: {
    scope: string
    windowMs?: number
    max?: number
  }
) => {
  const key = `${scope}:${getClientIp(request)}`
  if (consumeRateLimit({ key, windowMs, max })) {
    return null
  }

  return NextResponse.json({ error: "Muitas requisições. Tente novamente em alguns minutos." }, { status: 429 })
}

export const isSafeHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:")
  } catch {
    return false
  }
}

export const sanitizePlainText = (value: string) =>
  DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()

export const sanitizeOptionalPlainText = (value: string | null | undefined) =>
  value ? sanitizePlainText(value) : ""

export const publicError = (fallback = "Erro interno do servidor") =>
  process.env.NODE_ENV === "production" ? fallback : fallback

export const publicApiError = (error: unknown, fallback = "Não foi possível concluir a solicitação.") => {
  const message = error instanceof Error ? error.message : ""
  if (message === "Não autenticado.") return message
  if (message === "FORBIDDEN_RESOURCE") return "Recurso não encontrado ou sem permissão."
  return fallback
}

export const publicApiStatus = (error: unknown, fallbackStatus = 500) => {
  const message = error instanceof Error ? error.message : ""
  if (message === "Não autenticado.") return 401
  if (message === "FORBIDDEN_RESOURCE") return 403
  return fallbackStatus
}
