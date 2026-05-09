import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const normalizeSupabaseUrl = (value?: string) => {
  if (!value) return undefined

  try {
    const url = new URL(value.trim().replace(/^['"]|['"]$/g, ""))
    return url.origin
  } catch {
    return value
  }
}

const tables = [
  "profiles",
  "clients",
  "board_cards",
  "finance_transactions",
  "fixed_expenses",
  "quote_requests",
  "quote_presets",
  "google_drive_connections",
  "approval_links",
  "community_resources",
  "community_resource_interactions",
  "community_resource_comments",
  "job_posts",
] as const

export async function GET() {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase admin envs missing.",
        required: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const checks = await Promise.all(
    tables.map(async (table) => {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true }).limit(1)

      return {
        table,
        ok: !error,
        error: error?.message ?? null,
      }
    }),
  )

  return NextResponse.json({
    ok: checks.every((check) => check.ok),
    tables: checks,
  })
}
