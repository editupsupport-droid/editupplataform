"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Download, DownloadCloud, Heart, Loader2, MessageCircleMore, ThumbsDown, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { UpgradePaywall } from "@/components/dashboard/upgrade-paywall"
import { useAppSession } from "@/components/app/app-provider"
import { planMeets } from "@/lib/app-data"
import { authFetch } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type ExchangeComment = {
  id: string
  authorName: string
  body: string
  createdAt: string
}

type ExchangeResource = {
  id: string
  authorName: string
  canDelete: boolean
  title: string
  description: string
  driveFolderId: string
  driveFolderName: string
  thumbnailUrl: string
  thumbnailPositionX: number
  thumbnailPositionY: number
  thumbnailZoom: number
  hashtags: string[]
  createdAt: string
  likeCount: number
  dislikeCount: number
  commentCount: number
  myInteraction: "like" | "dislike" | null
  comments: ExchangeComment[]
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value))

export default function ExchangeResourceDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { currentUser } = useAppSession()
  const resourceId = params.id
  const [resource, setResource] = useState<ExchangeResource | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [comment, setComment] = useState("")
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackError, setFeedbackError] = useState("")
  const [paywallOpen, setPaywallOpen] = useState(false)
  const canDownloadMarketplace = currentUser ? planMeets(currentUser.plan, "essential") : false

  const loadResource = async () => {
    setIsLoading(true)
    setFeedbackError("")

    try {
      const response = await authFetch(`/api/community/resources?id=${resourceId}`)
      const payload = (await response.json().catch(() => ({}))) as { resources?: ExchangeResource[]; error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar o recurso.")
      setResource(payload.resources?.[0] ?? null)
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar o recurso.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadResource()
  }, [resourceId])

  const setInteraction = async (type: "like" | "dislike") => {
    if (!resource) return
    const nextType = resource.myInteraction === type ? null : type
    const previous = resource
    setResource({
      ...resource,
      myInteraction: nextType,
      likeCount: resource.likeCount + (nextType === "like" ? 1 : 0) - (resource.myInteraction === "like" ? 1 : 0),
      dislikeCount: resource.dislikeCount + (nextType === "dislike" ? 1 : 0) - (resource.myInteraction === "dislike" ? 1 : 0),
    })

    try {
      const response = await authFetch("/api/community/interactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id, type: nextType }),
      })
      if (!response.ok) throw new Error("Não foi possível salvar interação.")
    } catch (error) {
      console.error(error)
      setResource(previous)
      setFeedbackError("Não foi possível salvar interação.")
    }
  }

  const submitComment = async () => {
    if (!resource || !comment.trim()) return
    setIsSaving(true)
    setFeedbackError("")

    try {
      const response = await authFetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id, body: comment }),
      })
      const payload = (await response.json().catch(() => ({}))) as { comment?: ExchangeComment; error?: string }
      if (!response.ok || !payload.comment) throw new Error(payload.error ?? "Não foi possível comentar.")
      setResource({
        ...resource,
        commentCount: resource.commentCount + 1,
        comments: [...resource.comments, payload.comment],
      })
      setComment("")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível comentar.")
    } finally {
      setIsSaving(false)
    }
  }

  const importToDrive = async () => {
    if (!resource) return
    if (!canDownloadMarketplace) {
      setPaywallOpen(true)
      return
    }

    setIsImporting(true)
    setFeedbackError("")
    setFeedbackMessage("")

    try {
      const response = await authFetch("/api/community/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível importar.")
      setFeedbackMessage("Recurso importado para seu Drive como atalho.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível importar.")
    } finally {
      setIsImporting(false)
    }
  }

  const downloadToPc = () => {
    if (!resource) return
    if (!canDownloadMarketplace) {
      setPaywallOpen(true)
      return
    }

    window.open(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(resource.driveFolderId)}`, "_blank", "noopener,noreferrer")
  }

  const deleteResource = async () => {
    if (!resource || !window.confirm("Excluir esta postagem do Exchange?")) return
    setFeedbackError("")

    try {
      const response = await authFetch(`/api/community/resources?id=${resource.id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível excluir.")
      router.push("/dashboard/exchange")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível excluir.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-[12px] border border-border bg-card p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando recurso...
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" className="border-border">
          <Link href="/dashboard/exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Exchange
          </Link>
        </Button>
        <div className="rounded-[12px] border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Recurso não encontrado.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <UpgradePaywall
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title="Downloads liberados no Essential"
        description="No Starter você pode visualizar recursos do Exchange. Para baixar no Drive ou no PC, faça upgrade para o Essential."
        requiredPlan="Essential"
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Button asChild variant="outline" className="w-fit border-border">
          <Link href="/dashboard/exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Exchange
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isImporting}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void importToDrive()}>
                <DownloadCloud className="h-4 w-4" />
                Baixar no Drive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadToPc}>
                <Download className="h-4 w-4" />
                Baixar no PC
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {resource.canDelete ? (
            <Button variant="destructive" onClick={() => void deleteResource()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          ) : null}
        </div>
      </div>

      <FeedbackBanner message={feedbackMessage} type="success" />
      <FeedbackBanner message={feedbackError} type="error" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden rounded-[12px] border-border bg-card">
          <div className="aspect-video overflow-hidden bg-background">
            {resource.thumbnailUrl ? (
              <img
                src={resource.thumbnailUrl}
                alt={resource.title}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${resource.thumbnailPositionX}% ${resource.thumbnailPositionY}%`,
                  transform: `scale(${resource.thumbnailZoom / 100})`,
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">Sem thumbnail</div>
            )}
          </div>
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">{resource.title}</CardTitle>
            <CardDescription>{resource.authorName} • {formatDate(resource.createdAt)}</CardDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              {resource.hashtags.map((tag) => (
                <Badge key={tag} className="rounded-full bg-primary/15 text-primary">#{tag}</Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{resource.description || "Sem descrição."}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                variant={resource.myInteraction === "like" ? "default" : "outline"}
                className={cn(resource.myInteraction === "like" ? "bg-primary text-primary-foreground" : "border-border")}
                onClick={() => void setInteraction("like")}
              >
                <Heart className="mr-2 h-4 w-4" />
                Like {resource.likeCount}
              </Button>
              <Button
                variant={resource.myInteraction === "dislike" ? "default" : "outline"}
                className={cn(resource.myInteraction === "dislike" ? "bg-primary text-primary-foreground" : "border-border")}
                onClick={() => void setInteraction("dislike")}
              >
                <ThumbsDown className="mr-2 h-4 w-4" />
                Dislike {resource.dislikeCount}
              </Button>
              <Button variant="outline" className="border-border">
                <MessageCircleMore className="mr-2 h-4 w-4" />
                {resource.commentCount} comentários
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[12px] border-border bg-card">
          <CardHeader>
            <CardTitle>Comentários</CardTitle>
            <CardDescription>Feedbacks e discussão técnica sobre o recurso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-24" placeholder="Escreva um comentário..." />
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={!comment.trim() || isSaving} onClick={() => void submitComment()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar comentário
              </Button>
            </div>
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {resource.comments.length > 0 ? resource.comments.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{item.authorName}</p>
                    <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
                  Nenhum comentário ainda.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
