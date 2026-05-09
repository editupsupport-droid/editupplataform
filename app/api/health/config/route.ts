import { NextResponse } from "next/server"

const maskUrlHost = (value?: string) => {
  if (!value) return null

  try {
    return new URL(value).host
  } catch {
    return "invalid-url"
  }
}

export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  return NextResponse.json({
    supabase: {
      urlConfigured: Boolean(supabaseUrl),
      urlHost: maskUrlHost(supabaseUrl),
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
