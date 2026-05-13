"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Download, DownloadCloud, Heart, Loader2, MessageCircleMore, MoreVertical, Plus, Search, ThumbsDown, Trash2, UploadCloud } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { UpgradePaywall } from "@/components/dashboard/upgrade-paywall"
import { DrivePickerButton } from "@/components/google-drive/drive-picker-button"
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

const hashtagOptions = [
  { id: "packdeedicao", label: "#packdeedição" },
  { id: "soundeffects", label: "#soundeffects" },
  { id: "vfx", label: "#vfx" },
  { id: "colorgrading", label: "#colorgrading" },
  { id: "fontes", label: "#fontes" },
  { id: "presets", label: "#presets" },
  { id: "transicoes", label: "#transições" },
]

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value))

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ED"

const getHashtagLabel = (tag: string) =>
  hashtagOptions.find((item) => item.id === tag)?.label.replace(/^#/, "") ?? tag

const readImageAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(new Error("Não foi possível carregar a thumbnail."))
    reader.readAsDataURL(file)
  })

export default function CommunityExchangePage() {
  const { currentUser } = useAppSession()
  const [resources, setResources] = useState<ExchangeResource[]>([])
  const [query, setQuery] = useState("")
  const [activeHashtag, setActiveHashtag] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackError, setFeedbackError] = useState("")
  const [importingId, setImportingId] = useState("")
  const [paywallOpen, setPaywallOpen] = useState(false)
  const canDownloadMarketplace = currentUser ? planMeets(currentUser.plan, "essential") : false
  const [postForm, setPostForm] = useState({
    title: "",
    description: "",
    driveFolderId: "",
    driveFolderName: "",
    thumbnailUrl: "",
    thumbnailPositionX: 50,
    thumbnailPositionY: 50,
    thumbnailZoom: 100,
    hashtags: [] as string[],
  })

  const filteredResources = useMemo(() => resources, [resources])
  const canPost = postForm.title.trim().length >= 3 && postForm.driveFolderId && postForm.hashtags.length > 0 && !isPosting

  const loadResources = async () => {
    setIsLoading(true)
    setFeedbackError("")

    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("query", query.trim())
      if (activeHashtag) params.set("hashtag", activeHashtag)
      const response = await authFetch(`/api/community/resources?${params.toString()}`)
      const payload = (await response.json().catch(() => ({}))) as { resources?: ExchangeResource[]; error?: string; needsSchema?: boolean }

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível carregar o Exchange.")
      }

      setResources(payload.resources ?? [])
      if (payload.needsSchema) {
        setFeedbackError("Rode o SQL supabase/community-exchange.sql no Supabase para ativar o marketplace.")
      }
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar o Exchange.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadResources()
  }, [activeHashtag])

  const toggleHashtag = (tag: string) => {
    setPostForm((current) => ({
      ...current,
      hashtags: current.hashtags.includes(tag)
        ? current.hashtags.filter((item) => item !== tag)
        : [...current.hashtags, tag],
    }))
  }

  const handleThumbnail = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setFeedbackError("Envie uma imagem para a thumbnail.")
      return
    }
    const dataUrl = await readImageAsDataUrl(file)
    setPostForm((current) => ({ ...current, thumbnailUrl: dataUrl }))
  }

  const resetPostForm = () => {
    setPostForm({
      title: "",
      description: "",
      driveFolderId: "",
      driveFolderName: "",
      thumbnailUrl: "",
      thumbnailPositionX: 50,
      thumbnailPositionY: 50,
      thumbnailZoom: 100,
      hashtags: [],
    })
  }

  const submitPost = async () => {
    if (!canPost) return
    setIsPosting(true)
    setFeedbackError("")

    try {
      const response = await authFetch("/api/community/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postForm),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) throw new Error(payload.error ?? "Não foi possível publicar.")

      setFeedbackMessage("Recurso publicado no Exchange.")
      setDialogOpen(false)
      resetPostForm()
      await loadResources()
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível publicar.")
    } finally {
      setIsPosting(false)
    }
  }

  const setInteraction = async (resource: ExchangeResource, type: "like" | "dislike") => {
    const nextType = resource.myInteraction === type ? null : type
    const previousResources = resources
    setResources((current) =>
      current.map((item) => {
        if (item.id !== resource.id) return item
        const previous = item.myInteraction
        return {
          ...item,
          myInteraction: nextType,
          likeCount: item.likeCount + (nextType === "like" ? 1 : 0) - (previous === "like" ? 1 : 0),
          dislikeCount: item.dislikeCount + (nextType === "dislike" ? 1 : 0) - (previous === "dislike" ? 1 : 0),
        }
      })
    )

    try {
      const response = await authFetch("/api/community/interactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id, type: nextType }),
      })
      if (!response.ok) throw new Error("Não foi possível salvar interação.")
    } catch (error) {
      console.error(error)
      setResources(previousResources)
      setFeedbackError("Não foi possível salvar interação.")
    }
  }

  const deleteResource = async (resourceId: string) => {
    if (!window.confirm("Excluir esta postagem do Exchange?")) return
    const previousResources = resources
    setResources((current) => current.filter((item) => item.id !== resourceId))
    setFeedbackError("")

    try {
      const response = await authFetch(`/api/community/resources?id=${resourceId}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível excluir.")
      setFeedbackMessage("Postagem excluída.")
    } catch (error) {
      console.error(error)
      setResources(previousResources)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível excluir.")
    }
  }

  const downloadToPc = (resource: ExchangeResource) => {
    if (!canDownloadMarketplace) {
      setPaywallOpen(true)
      return
    }

    window.open(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(resource.driveFolderId)}`, "_blank", "noopener,noreferrer")
  }

  const importToDrive = async (resourceId: string) => {
    if (!canDownloadMarketplace) {
      setPaywallOpen(true)
      return
    }

    setImportingId(resourceId)
    setFeedbackError("")
    setFeedbackMessage("")

    try {
      const response = await authFetch("/api/community/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível importar.")
      setFeedbackMessage("Recurso importado para seu Drive como atalho.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível importar.")
    } finally {
      setImportingId("")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">EditUp Community Exchange</h1>
          <p className="mt-1 text-muted-foreground">Marketplace interno de packs, presets, VFX e SFX compartilhados via Drive.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Publicar recurso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card">
            <DialogHeader>
              <DialogTitle>Novo recurso</DialogTitle>
              <DialogDescription>Compartilhe uma pasta do Drive com a comunidade EditUp.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={postForm.title} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Pasta do Drive</Label>
                  <DrivePickerButton
                    mode="folder"
                    onPick={(folder) => setPostForm({ ...postForm, driveFolderId: folder.id, driveFolderName: folder.name })}
                    className="w-full justify-start border-border"
                  />
                </div>
              </div>
              {postForm.driveFolderId ? (
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  Pasta selecionada: <span className="font-medium text-foreground">{postForm.driveFolderName || postForm.driveFolderId}</span>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={postForm.description} onChange={(event) => setPostForm({ ...postForm, description: event.target.value })} className="min-h-24" />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                <Input type="file" accept="image/*" onChange={(event) => void handleThumbnail(event.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">Tamanho ideal para este modo: 1080x1350px ou 1080x1500px.</p>
                {postForm.thumbnailUrl ? (
                  <div className="space-y-3 rounded-xl border border-border bg-background p-3">
                    <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                      <img
                        src={postForm.thumbnailUrl}
                        alt="Prévia da thumbnail"
                        className="h-full w-full object-cover"
                        style={{
                          objectPosition: `${postForm.thumbnailPositionX}% ${postForm.thumbnailPositionY}%`,
                          transform: `scale(${postForm.thumbnailZoom / 100})`,
                        }}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Horizontal</Label>
                        <Slider value={[postForm.thumbnailPositionX]} min={0} max={100} step={1} onValueChange={([value]) => setPostForm({ ...postForm, thumbnailPositionX: value ?? 50 })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Vertical</Label>
                        <Slider value={[postForm.thumbnailPositionY]} min={0} max={100} step={1} onValueChange={([value]) => setPostForm({ ...postForm, thumbnailPositionY: value ?? 50 })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Zoom</Label>
                        <Slider value={[postForm.thumbnailZoom]} min={100} max={200} step={5} onValueChange={([value]) => setPostForm({ ...postForm, thumbnailZoom: value ?? 100 })} />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Hashtags obrigatórias</Label>
                <div className="flex flex-wrap gap-2">
                  {hashtagOptions.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleHashtag(tag.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        postForm.hashtags.includes(tag.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={!canPost} onClick={() => void submitPost()}>
                {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Publicar no Exchange
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <FeedbackBanner message={feedbackMessage} type="success" />
      <FeedbackBanner message={feedbackError} type="error" />
      <UpgradePaywall
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title="Downloads liberados no Essential"
        description="No Starter você pode visualizar o Exchange. Para baixar no Drive ou no PC, faça upgrade para o Essential."
        requiredPlan="Essential"
      />

      <Card className="rounded-[12px] border-border bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadResources()
              }}
              placeholder="Buscar packs, presets, VFX..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={!activeHashtag ? "default" : "outline"} className={cn(!activeHashtag ? "bg-primary text-primary-foreground" : "border-border")} onClick={() => setActiveHashtag("")}>
              Todas
            </Button>
            {hashtagOptions.map((tag) => (
              <Button
                key={tag.id}
                variant={activeHashtag === tag.id ? "default" : "outline"}
                className={cn(activeHashtag === tag.id ? "bg-primary text-primary-foreground" : "border-border")}
                onClick={() => setActiveHashtag(tag.id)}
              >
                {tag.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-[12px] border border-border bg-card p-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando Exchange...
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Nenhum recurso encontrado.
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-[1160px] gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-none">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="bg-secondary text-xs font-semibold text-foreground">
                      {getInitials(resource.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{resource.authorName}</p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(resource.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {resource.canDelete ? (
                      <DropdownMenuItem variant="destructive" onClick={() => void deleteResource(resource.id)}>
                        <Trash2 className="h-4 w-4" />
                        Excluir postagem
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled>Sem ações disponíveis</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Link href={`/dashboard/exchange/${resource.id}`} className="block aspect-square overflow-hidden border-b border-border bg-background">
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
              </Link>

              <CardContent className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-md text-foreground hover:bg-secondary hover:text-primary",
                        resource.myInteraction === "like" && "text-primary"
                      )}
                      onClick={() => void setInteraction(resource, "like")}
                      aria-label="Curtir"
                    >
                      <Heart className={cn("h-5 w-5", resource.myInteraction === "like" && "fill-current")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-md text-foreground hover:bg-secondary hover:text-destructive",
                        resource.myInteraction === "dislike" && "text-destructive"
                      )}
                      onClick={() => void setInteraction(resource, "dislike")}
                      aria-label="Não curtir"
                    >
                      <ThumbsDown className={cn("h-5 w-5", resource.myInteraction === "dislike" && "fill-current")} />
                    </Button>
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-md text-foreground hover:bg-secondary hover:text-primary" aria-label="Comentar">
                      <Link href={`/dashboard/exchange/${resource.id}`}>
                        <MessageCircleMore className="h-5 w-5" />
                      </Link>
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" disabled={importingId === resource.id}>
                        {importingId === resource.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-5 w-5" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void importToDrive(resource.id)}>
                        <DownloadCloud className="h-4 w-4" />
                        Baixar no Drive
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadToPc(resource)}>
                        <Download className="h-4 w-4" />
                        Baixar no PC
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm font-semibold text-foreground">
                  {resource.likeCount} curtidas
                  {resource.dislikeCount > 0 ? <span className="font-normal text-muted-foreground"> • {resource.dislikeCount} dislikes</span> : null}
                </p>

                <Link href={`/dashboard/exchange/${resource.id}`} className="line-clamp-2 block text-sm font-semibold leading-5 text-foreground hover:text-primary">
                  {resource.title}
                </Link>
                {resource.description ? (
                  <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{resource.description}</p>
                ) : null}
                {resource.commentCount > 0 ? (
                  <Link href={`/dashboard/exchange/${resource.id}`} className="block text-sm text-muted-foreground hover:text-foreground">
                    Ver {resource.commentCount} comentário{resource.commentCount === 1 ? "" : "s"}
                  </Link>
                ) : (
                  <Link href={`/dashboard/exchange/${resource.id}`} className="block text-sm text-muted-foreground hover:text-foreground">
                    Adicionar comentário
                  </Link>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {resource.hashtags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="rounded-md border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      #{getHashtagLabel(tag)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
