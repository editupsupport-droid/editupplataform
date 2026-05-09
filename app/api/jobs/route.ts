import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { enforceApiRateLimit, ensureSameOrigin, requireAdminAuthenticatedUser, sanitizePlainText } from "@/lib/api-admin"
import { serializeJobDescription } from "@/lib/app-data"

export const runtime = "nodejs"
const jobColumns =
  "id,title,company,location,format,salary,description,contact,status,published_by,created_at,updated_at"

const createJobSchema = z.object({
  title: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(120),
  format: z.string().trim().min(1).max(80),
  salary: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(5000),
  referenceLink: z.string().trim().max(500).optional(),
  contact: z.string().trim().min(1).max(200),
  status: z.enum(["open", "found", "cancelled"]).optional(),
})

const updateJobSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "found", "cancelled"]),
})

const deleteJobSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdminAuthenticatedUser(request)
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
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "jobs:post", 30)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const body = createJobSchema.parse((await request.json()) as Record<string, unknown>)
    const payload = {
      title: sanitizePlainText(body.title),
      company: sanitizePlainText(body.company),
      location: sanitizePlainText(body.location),
      format: sanitizePlainText(body.format),
      salary: sanitizePlainText(body.salary),
      description: serializeJobDescription(sanitizePlainText(body.description), body.referenceLink),
      contact: sanitizePlainText(body.contact),
      status: body.status ?? "open",
      published_by: user.id,
    }

    const { data, error } = await supabase.from("job_posts").insert(payload).select(jobColumns).single()

    if (error) {
      const message = error.message.includes("row-level security")
        ? "Seu usuário não tem permissão para publicar vagas."
        : "Erro ao publicar vaga."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Não foi possível publicar a vaga." }, { status: 400 })
    }

    return NextResponse.json({ job: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Erro ao publicar vaga."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "jobs:patch", 60)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const { id, status } = updateJobSchema.parse((await request.json()) as { id?: string; status?: string })

    const { data, error } = await supabase
      .from("job_posts")
      .update({ status })
      .eq("id", id)
      .eq("published_by", user.id)
      .select(jobColumns)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: "Erro ao atualizar vaga." }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Vaga não encontrada ou sem permissão." }, { status: 404 })
    }

    return NextResponse.json({ job: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Erro ao atualizar vaga."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "jobs:delete", 60)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const { id } = deleteJobSchema.parse(await request.json())

    const { data, error } = await supabase
      .from("job_posts")
      .delete()
      .eq("id", id)
      .eq("published_by", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: "Erro ao remover vaga." }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Vaga não encontrada ou sem permissão." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Erro ao remover vaga."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
