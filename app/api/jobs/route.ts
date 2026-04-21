import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"
const jobColumns =
  "id,title,company,location,format,salary,description,contact,status,published_by,created_at,updated_at"

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthenticatedUser(request)
    const { data, error } = await supabase.from("job_posts").select(jobColumns).order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ jobs: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar vagas."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = (await request.json()) as Record<string, unknown>
    const payload = {
      title: body.title,
      company: body.company,
      location: body.location,
      format: body.format,
      salary: body.salary,
      description: body.description,
      contact: body.contact,
      status: body.status ?? "open",
      published_by: user.id,
    }

    const { data, error } = await supabase.from("job_posts").insert(payload).select(jobColumns).single()

    if (error) {
      const message = error.message.includes("row-level security")
        ? "Seu usuário não tem permissão para publicar vagas."
        : error.message
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Não foi possível publicar a vaga." }, { status: 400 })
    }

    return NextResponse.json({ job: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao publicar vaga."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const { id, status } = (await request.json()) as { id?: string; status?: string }

    if (!id || !status) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("job_posts")
      .update({ status })
      .eq("id", id)
      .eq("published_by", user.id)
      .select(jobColumns)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Vaga não encontrada ou sem permissão." }, { status: 404 })
    }

    return NextResponse.json({ job: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar vaga."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const { id } = (await request.json()) as { id?: string }

    if (!id) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("job_posts")
      .delete()
      .eq("id", id)
      .eq("published_by", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Vaga não encontrada ou sem permissão." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover vaga."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
