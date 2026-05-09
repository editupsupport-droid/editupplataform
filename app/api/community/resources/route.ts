import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { enforceApiRateLimit, ensureSameOrigin, requireAdminAuthenticatedUser, sanitizeOptionalPlainText, sanitizePlainText } from "@/lib/api-admin"

export const runtime = "nodejs"

const allowedHashtags = ["packdeedicao", "soundeffects", "vfx", "colorgrading", "fontes", "presets", "transicoes"]

const resourceSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1200).optional().default(""),
  driveFolderId: z.string().trim().min(1).max(240),
  driveFolderName: z.string().trim().max(240).optional().default(""),
  thumbnailUrl: z.string().trim().max(1_500_000).optional().default(""),
  thumbnailPositionX: z.number().int().min(0).max(100).optional().default(50),
  thumbnailPositionY: z.number().int().min(0).max(100).optional().default(50),
  thumbnailZoom: z.number().int().min(100).max(200).optional().default(100),
  hashtags: z.array(z.string().trim().min(1)).min(1).max(8),
})

const normalizeTag = (value: string) => value.replace(/^#/, "").trim().toLowerCase().replace(/ç/g, "c").replace(/ã/g, "a")
const escapePostgrestPattern = (value: string) => value.replace(/[\\%_,()]/g, "\\$&")

const isMissingExchangeTables = (message?: string | null) =>
  typeof message === "string" &&
  (message.includes("community_resources") || message.includes("community_resource_interactions") || message.includes("community_resource_comments")) &&
  (message.includes("schema cache") || message.includes("Could not find") || message.includes("does not exist"))

const getAccountName = (profile: { full_name?: string | null; appearance_theme?: unknown } | null, fallback: string) => {
  const appearance = profile?.appearance_theme && typeof profile.appearance_theme === "object" && !Array.isArray(profile.appearance_theme)
    ? profile.appearance_theme as Record<string, unknown>
    : {}
  const account = appearance.__account && typeof appearance.__account === "object" && !Array.isArray(appearance.__account)
    ? appearance.__account as Record<string, unknown>
    : {}

  return String(account.name || profile?.full_name || fallback || "Editor")
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitError = enforceApiRateLimit(request, "community-resources:get")
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const id = request.nextUrl.searchParams.get("id")?.trim() ?? ""
    const query = request.nextUrl.searchParams.get("query")?.trim() ?? ""
    const hashtag = normalizeTag(request.nextUrl.searchParams.get("hashtag") ?? "")

    let resourcesQuery = supabase
      .from("community_resources")
      .select("id,user_id,author_name,title,description,drive_folder_id,drive_folder_name,thumbnail_url,thumbnail_position_x,thumbnail_position_y,thumbnail_zoom,hashtags,created_at")
      .order("created_at", { ascending: false })
      .limit(60)

    if (id) {
      resourcesQuery = resourcesQuery.eq("id", id).limit(1)
    }

    if (query) {
      const escapedQuery = escapePostgrestPattern(query).slice(0, 80)
      resourcesQuery = resourcesQuery.or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`)
    }

    if (hashtag) {
      resourcesQuery = resourcesQuery.contains("hashtags", [hashtag])
    }

    const { data: resources, error } = await resourcesQuery

    if (error) {
      return NextResponse.json(
        { resources: [], needsSchema: isMissingExchangeTables(error.message), error: "Não foi possível carregar o Exchange." },
        { status: isMissingExchangeTables(error.message) ? 200 : 400 }
      )
    }

    const ids = (resources ?? []).map((item) => item.id)
    const [{ data: interactions }, { data: comments }] = await Promise.all([
      ids.length
        ? supabase.from("community_resource_interactions").select("resource_id,user_id,interaction_type").in("resource_id", ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase.from("community_resource_comments").select("id,resource_id,author_name,body,created_at").in("resource_id", ids).order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
    ])

    const mapped = (resources ?? []).map((resource) => {
      const resourceInteractions = (interactions ?? []).filter((item) => item.resource_id === resource.id)
      return {
        id: resource.id,
        authorName: resource.author_name,
        canDelete: resource.user_id === user.id || user.email?.toLowerCase() === "marinhojose1103@gmail.com",
        title: resource.title,
        description: resource.description,
        driveFolderId: resource.drive_folder_id,
        driveFolderName: resource.drive_folder_name,
        thumbnailUrl: resource.thumbnail_url,
        thumbnailPositionX: resource.thumbnail_position_x ?? 50,
        thumbnailPositionY: resource.thumbnail_position_y ?? 50,
        thumbnailZoom: resource.thumbnail_zoom ?? 100,
        hashtags: resource.hashtags ?? [],
        createdAt: resource.created_at,
        likeCount: resourceInteractions.filter((item) => item.interaction_type === "like").length,
        dislikeCount: resourceInteractions.filter((item) => item.interaction_type === "dislike").length,
        myInteraction: resourceInteractions.find((item) => item.user_id === user.id)?.interaction_type ?? null,
        commentCount: (comments ?? []).filter((comment) => comment.resource_id === resource.id).length,
        comments: (comments ?? [])
          .filter((comment) => comment.resource_id === resource.id)
          .map((comment) => ({
            id: comment.id,
            authorName: comment.author_name,
            body: comment.body,
            createdAt: comment.created_at,
          })),
      }
    })

    return NextResponse.json({ resources: mapped, needsSchema: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar o Exchange."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "community-resources:post", 30)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const body = resourceSchema.parse(await request.json())
    const hashtags = [...new Set(body.hashtags.map(normalizeTag).filter((tag) => allowedHashtags.includes(tag)))]

    if (hashtags.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos uma hashtag válida." }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,appearance_theme")
      .eq("id", user.id)
      .maybeSingle()

    const { data, error } = await supabase
      .from("community_resources")
      .insert({
        user_id: user.id,
        author_name: getAccountName(profile, user.email ?? "Editor"),
        title: sanitizePlainText(body.title),
        description: sanitizeOptionalPlainText(body.description),
        drive_folder_id: body.driveFolderId,
        drive_folder_name: sanitizeOptionalPlainText(body.driveFolderName),
        thumbnail_url: body.thumbnailUrl,
        thumbnail_position_x: body.thumbnailPositionX,
        thumbnail_position_y: body.thumbnailPositionY,
        thumbnail_zoom: body.thumbnailZoom,
        hashtags,
      })
      .select("id")
      .single()

    if (error) {
      return NextResponse.json({ error: "Não foi possível publicar o recurso.", needsSchema: isMissingExchangeTables(error.message) }, { status: 400 })
    }

    return NextResponse.json({ id: data.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Não foi possível publicar o recurso."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "community-resources:delete", 30)
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAdminAuthenticatedUser(request)
    const id = request.nextUrl.searchParams.get("id")?.trim() ?? ""
    if (!id) return NextResponse.json({ error: "Recurso inválido." }, { status: 400 })

    const { data: resource, error: resourceError } = await supabase
      .from("community_resources")
      .select("id,user_id")
      .eq("id", id)
      .maybeSingle()

    if (resourceError) return NextResponse.json({ error: "Não foi possível validar o recurso." }, { status: 400 })
    if (!resource) return NextResponse.json({ error: "Recurso não encontrado." }, { status: 404 })

    const canDelete = resource.user_id === user.id || user.email?.toLowerCase() === "marinhojose1103@gmail.com"
    if (!canDelete) return NextResponse.json({ error: "Você não pode excluir esta postagem." }, { status: 403 })

    const { error } = await supabase
      .from("community_resources")
      .delete()
      .eq("id", id)

    if (error) return NextResponse.json({ error: "Não foi possível excluir o recurso." }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível excluir o recurso."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
