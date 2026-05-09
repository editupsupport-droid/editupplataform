import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthenticatedUser } from "@/lib/supabase-server"
import { enforceRateLimit, ensureTrustedOrigin, isSafeHttpUrl } from "@/lib/security"

export const runtime = "nodejs"
const baseClientColumns = "id,user_id,name,phone,country_code,edit_level,average_duration,frequency,drive_link,created_at,updated_at"
const driveClientColumns = `${baseClientColumns},drive_folder_id,drive_folder_name`

type ClientBody = {
  id?: string
  name?: string
  phone?: string
  countryCode?: string
  editLevel?: string
  averageDuration?: number
  frequency?: string
  driveLink?: string
  driveFolderId?: string
  driveFolderName?: string
}

const clientBodySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Dados do cliente inválidos.").max(120),
  phone: z.string().trim().max(40).optional(),
  countryCode: z.string().trim().max(8).optional(),
  editLevel: z.enum(["simples", "medio", "profissional"]).optional(),
  averageDuration: z.number().int().min(1).max(600).optional(),
  frequency: z.string().trim().max(120).optional(),
  driveLink: z.string().trim().max(500).optional(),
  driveFolderId: z.string().trim().max(200).optional().nullable(),
  driveFolderName: z.string().trim().max(200).optional(),
})

const clientDeleteSchema = z.object({
  id: z.string().uuid(),
})

const sanitizeOptionalPlainText = (value: string | null | undefined) =>
  value ? value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim() : ""

const clientRouteError = (stage: string, error: unknown) => {
  const message = error instanceof Error ? error.message : "Erro desconhecido."

  console.error(`[api/clients] ${stage}`, error)

  if (message === "Não autenticado.") {
    return NextResponse.json({ error: "Não autenticado.", stage }, { status: 401 })
  }

  return NextResponse.json(
    {
      error:
        process.env.NODE_ENV === "production"
          ? `Falha em /api/clients (${stage}). Verifique o schema/RLS do Supabase.`
          : message,
      stage,
    },
    { status: 500 },
  )
}

const isMissingDriveFolderColumns = (message?: string | null) =>
  typeof message === "string" &&
  (message.includes("clients.drive_folder_id") ||
    message.includes("clients.drive_folder_name") ||
    message.includes("'drive_folder_id' column") ||
    message.includes("'drive_folder_name' column") ||
    message.includes("drive_folder_id column") ||
    message.includes("drive_folder_name column") ||
    message.includes("column drive_folder_id") ||
    message.includes("column drive_folder_name"))

const selectClientColumns = async (supabase: Awaited<ReturnType<typeof requireAuthenticatedUser>>["supabase"], userId: string) => {
  const preferred = await supabase
    .from("clients")
    .select(driveClientColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (!preferred.error) {
    return { data: preferred.data ?? [], supportsDriveFolders: true as const, error: null }
  }

  if (!isMissingDriveFolderColumns(preferred.error.message)) {
    return { data: null, supportsDriveFolders: false as const, error: preferred.error }
  }

  const fallback = await supabase
    .from("clients")
    .select(baseClientColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return {
    data: fallback.data ?? [],
    supportsDriveFolders: false as const,
    error: fallback.error,
  }
}

const saveClientRecord = async ({
  supabase,
  userId,
  body,
}: {
  supabase: Awaited<ReturnType<typeof requireAuthenticatedUser>>["supabase"]
  userId: string
  body: z.infer<typeof clientBodySchema>
}) => {
  const basePayload = {
    user_id: userId,
    name: sanitizeOptionalPlainText(body.name),
    phone: sanitizeOptionalPlainText(body.phone),
    country_code: body.countryCode?.trim() ?? "+55",
    edit_level: body.editLevel?.trim() ?? "simples",
    average_duration: body.averageDuration ?? 15,
    frequency: sanitizeOptionalPlainText(body.frequency),
    drive_link: body.driveLink?.trim() ?? "",
  }

  const drivePayload = {
    ...basePayload,
    drive_folder_id: body.driveFolderId?.trim() ?? null,
    drive_folder_name: sanitizeOptionalPlainText(body.driveFolderName),
  }

  const runWrite = async (payload: typeof basePayload | typeof drivePayload, columns: string) =>
    body.id
      ? supabase.from("clients").update(payload).eq("id", body.id).eq("user_id", userId).select(columns).maybeSingle()
      : supabase.from("clients").insert(payload).select(columns).single()

  const preferred = await runWrite(drivePayload, driveClientColumns)

  if (!preferred.error) {
    return { data: preferred.data, supportsDriveFolders: true as const, error: null }
  }

  if (!isMissingDriveFolderColumns(preferred.error.message)) {
    return { data: null, supportsDriveFolders: false as const, error: preferred.error }
  }

  const fallback = await runWrite(basePayload, baseClientColumns)

  return {
    data: fallback.data,
    supportsDriveFolders: false as const,
    error: fallback.error,
  }
}

export async function GET(request: NextRequest) {
  try {
    let auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>
    try {
      auth = await requireAuthenticatedUser(request)
    } catch (error) {
      return clientRouteError("auth", error)
    }

    const { data, error, supportsDriveFolders } = await selectClientColumns(auth.supabase, auth.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ clients: data ?? [], supportsDriveFolders })
  } catch (error) {
    return clientRouteError("select", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "clients:post", max: 80 })
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = clientBodySchema.parse((await request.json()) as ClientBody)

    if (body.driveLink && !isSafeHttpUrl(body.driveLink)) {
      return NextResponse.json({ error: "Link do Drive inválido." }, { status: 400 })
    }

    const { data, error, supportsDriveFolders } = await saveClientRecord({
      supabase,
      userId: user.id,
      body,
    })

    if (error) {
      return NextResponse.json({ error: "Failed to save client." }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Client not found for update." }, { status: 404 })
    }

    return NextResponse.json({ client: data, supportsDriveFolders })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid client data." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Failed to save client."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "clients:delete", max: 60 })
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAuthenticatedUser(request)
    const { id } = clientDeleteSchema.parse(await request.json())

    const { data, error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: "Failed to delete client." }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Client not found or permission denied." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid client." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Failed to delete client."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
