import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"
const clientColumns = "id,user_id,name,phone,country_code,edit_level,average_duration,frequency,drive_link,created_at,updated_at"

type ClientBody = {
  id?: string
  name?: string
  phone?: string
  countryCode?: string
  editLevel?: string
  averageDuration?: number
  frequency?: string
  driveLink?: string
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const { data, error } = await supabase
      .from("clients")
      .select(clientColumns)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ clients: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar clientes."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = (await request.json()) as ClientBody

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Dados do cliente inválidos." }, { status: 400 })
    }

    const payload = {
      user_id: user.id,
      name: body.name.trim(),
      phone: body.phone?.trim() ?? "",
      country_code: body.countryCode?.trim() ?? "+55",
      edit_level: body.editLevel?.trim() ?? "simples",
      average_duration: body.averageDuration ?? 15,
      frequency: body.frequency?.trim() ?? "",
      drive_link: body.driveLink?.trim() ?? "",
    }

    const query = body.id
      ? supabase.from("clients").update(payload).eq("id", body.id).eq("user_id", user.id).select(clientColumns).maybeSingle()
      : supabase.from("clients").insert(payload).select(clientColumns).single()

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Cliente não encontrado para atualização." }, { status: 404 })
    }

    return NextResponse.json({ client: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar cliente."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const { id } = (await request.json()) as { id?: string }

    if (!id) {
      return NextResponse.json({ error: "Cliente inválido." }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Cliente não encontrado ou sem permissão." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover cliente."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
