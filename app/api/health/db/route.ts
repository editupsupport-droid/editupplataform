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

const columnChecks = [
  {
    table: "profiles",
    columns:
      "id,email,full_name,professional_title,bio,location,slug,banner_url,video_url,edit_tools,video_styles,contact_method,contact_value,plan,subscription_tier,subscription_status,creative_cloud_redeem_available_until,can_publish_jobs,monthly_revenue_goal,app_language,appearance_theme,account_name,account_photo_url,quote_form_config,created_at,updated_at",
  },
  {
    table: "board_cards",
    columns:
      "id,user_id,title,description,client_id,client_name,due_date,column_id,position,drive_link,approval_link,approval_token_hash,approval_expires_at,approved,client_feedback,client_status,notification_read,created_at,updated_at",
  },
  {
    table: "clients",
    columns:
      "id,user_id,name,phone,country_code,edit_level,average_duration,frequency,drive_link,drive_folder_id,drive_folder_name,created_at,updated_at",
  },
  {
    table: "finance_transactions",
    columns: "id,user_id,kind,amount,description,category,client_name,transaction_date,created_at,updated_at",
  },
  {
    table: "fixed_expenses",
    columns: "id,user_id,name,amount,category,created_at,updated_at",
  },
  { table: "quote_requests", columns: "id,status,form_answers,pricing_breakdown,calculated_price,manual_adjustment,editor_message,finalized_at" },
  {
    table: "job_posts",
    columns: "id,title,company,location,format,salary,description,contact,status,published_by,created_at,updated_at",
  },
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

  const columns = await Promise.all(
    columnChecks.map(async (check) => {
      const table = check.table as string
      const columnsToSelect = check.columns as string
      const { error } = await supabase.from(table).select(columnsToSelect, { head: true }).limit(1)

      return {
        table: check.table,
        ok: !error,
        columns: check.columns.split(","),
        error: error?.message ?? null,
      }
    }),
  )

  return NextResponse.json({
    ok: checks.every((check) => check.ok) && columns.every((check) => check.ok),
    tables: checks,
    columns,
  })
}
