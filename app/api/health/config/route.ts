import { NextResponse } from "next/server"

const inspectSupabaseUrl = (value?: string) => {
  if (!value) {
    return {
      configured: false,
      valid: false,
      host: null,
      path: null,
      hasExtraPath: false,
      expectedFormat: "https://seu-projeto.supabase.co",
    }
  }

  try {
    const url = new URL(value.trim().replace(/^['"]|['"]$/g, ""))
    const path = url.pathname === "/" ? "" : url.pathname

    return {
      configured: true,
      valid: url.protocol === "https:" && url.hostname.endsWith(".supabase.co"),
      host: url.host,
      path,
      hasExtraPath: Boolean(path),
      expectedFormat: "https://seu-projeto.supabase.co",
    }
  } catch {
    return {
      configured: true,
      valid: false,
      host: "invalid-url",
      path: null,
      hasExtraPath: false,
      expectedFormat: "https://seu-projeto.supabase.co",
    }
  }
}

export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  return NextResponse.json({
    supabase: {
      url: inspectSupabaseUrl(supabaseUrl),
      anonKeyConfigured: Boolean(supabaseAnonKey),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    },
    app: {
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
  })
}
