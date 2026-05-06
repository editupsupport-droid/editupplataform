import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { deleteDrivePermission } from "@/lib/google-drive"
import { pushUserNotification } from "@/lib/editup-state"

export const runtime = "nodejs"

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não está configurado.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const isAuthorizedCron = (request: NextRequest) => {
  if (request.headers.get("x-vercel-cron") === "1") {
    return true
  }

  const secret = request.nextUrl.searchParams.get("secret")?.trim()
  return Boolean(secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET)
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const nowIso = new Date().toISOString()
    const { data: expiredLinks, error } = await supabase
      .from("approval_links")
      .select("id,user_id,task_id,file_id,file_name,permission_id,source_type,status")
      .eq("status", "active")
      .lt("expires_at", nowIso)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let expiredCount = 0

    for (const link of expiredLinks ?? []) {
      if (link.source_type === "google-drive" && link.file_id && link.permission_id) {
        await deleteDrivePermission(link.user_id, link.file_id, link.permission_id).catch(() => undefined)
      }

      await supabase.from("approval_links").update({ status: "expired" }).eq("id", link.id)
      await supabase
        .from("board_cards")
        .update({ approval_link: null, notification_read: false })
        .eq("id", link.task_id)
        .eq("user_id", link.user_id)

      await pushUserNotification({
        id: crypto.randomUUID(),
        userId: link.user_id,
        title: "Link de aprovação expirado",
        message: `O link de aprovação do vídeo ${link.file_name || "sem nome"} expirou e foi removido.`,
        kind: "approval-expired",
        createdAt: new Date().toISOString(),
        read: false,
      })

      expiredCount += 1
    }

    return NextResponse.json({ success: true, expiredCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível limpar os links expirados."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
