"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { Check, CheckCircle2, Copy, Download, ExternalLink, PauseCircle, Play, Plus, Trash2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAppPreferences } from "@/components/app/preferences-provider"
import { WorkspaceTask } from "@/lib/workspace-store"
import {
  formatTimestamp,
  getExternalVideoEmbedUrl,
  getGoogleDriveEmbedUrl,
  getGoogleDriveVideoUrl,
  parseReviewFeedback,
  parseTimestampInput,
  ReviewFeedbackData,
  ReviewTimelineItem,
} from "@/lib/review-utils"
import { copyTextToClipboard } from "@/lib/clipboard"

type ApprovalTaskPayload = Pick<WorkspaceTask, "id" | "titulo" | "descricao" | "clienteNome" | "linkDrive" | "statusCliente">

type EditorPreview = {
  full_name?: string
  professional_title?: string
  bio?: string
  location?: string
  slug?: string
  contact_method?: string
  contact_value?: string
  plan?: "free" | "starter" | "essential" | "pro"
  logo_url?: string
}

export default function ApprovalPage() {
  const { formatCurrency } = useAppPreferences()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const taskId = typeof params.id === "string" ? params.id : ""
  const reviewToken = searchParams.get("token") ?? ""
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [task, setTask] = useState<WorkspaceTask | null>(null)
  const [editor, setEditor] = useState<EditorPreview | null>(null)
  const [review, setReview] = useState<ReviewFeedbackData>(parseReviewFeedback(""))
  const [capturedItems, setCapturedItems] = useState<ReviewTimelineItem[]>([])
  const [timestampInput, setTimestampInput] = useState("00:00")
  const [draftNote, setDraftNote] = useState("")
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [responseStatus, setResponseStatus] = useState<WorkspaceTask["statusCliente"]>("pendente")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useEmbedFallback, setUseEmbedFallback] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [isRevisionMode, setIsRevisionMode] = useState(false)
  const [copiedPix, setCopiedPix] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState("Final")

  useEffect(() => {
    if (!taskId || !reviewToken) return

    const loadTask = async () => {
      try {
        const response = await fetch(`/api/approval/${taskId}?token=${encodeURIComponent(reviewToken)}`, { cache: "no-store" })
        const data = (await response.json()) as {
          available?: boolean
          task?: ApprovalTaskPayload
          editor?: EditorPreview | null
          review?: ReviewFeedbackData
        }

        if (response.ok && data.available && data.task) {
          setTask({
            id: data.task.id,
            titulo: data.task.titulo,
            descricao: data.task.descricao ?? "",
            clienteId: "",
            clienteNome: data.task.clienteNome ?? "",
            prazo: new Date().toISOString(),
            colunaId: "waiting-response",
            linkDrive: data.task.linkDrive ?? "",
            statusCliente: data.task.statusCliente ?? "pendente",
          })
          setEditor(data.editor ?? null)
          const nextReview = data.review ?? parseReviewFeedback("")
          setReview(nextReview)
          setCapturedItems(nextReview.revisionItems)
        } else {
          setTask(null)
        }
      } catch (error) {
        console.error(error)
        setTask(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadTask()
  }, [taskId, reviewToken])

  const directVideoUrl = useMemo(() => {
    const rawLink = task?.linkDrive ?? ""
    if (getExternalVideoEmbedUrl(rawLink)) return ""
    return getGoogleDriveVideoUrl(rawLink) ?? rawLink
  }, [task?.linkDrive])
  const embedVideoUrl = useMemo(
    () => getExternalVideoEmbedUrl(task?.linkDrive ?? "") ?? "",
    [task?.linkDrive]
  )
  const isStarterApproval = editor?.plan === "free" || editor?.plan === "starter" || !editor?.plan
  const approvalLogo = editor?.plan === "pro" && editor.logo_url ? editor.logo_url : isStarterApproval ? "/logo.jpeg" : ""

  const downloadUrl = useMemo(() => {
    const rawLink = task?.linkDrive ?? ""
    if (getGoogleDriveEmbedUrl(rawLink)) return ""
    return getGoogleDriveVideoUrl(rawLink) ?? rawLink
  }, [task?.linkDrive])

  const submitApproval = async (action: "approve" | "revision") => {
    if (!taskId || !reviewToken) return

    setIsSubmitting(true)
    setSubmitError("")

    try {
      const response = await fetch(`/api/approval/${taskId}?token=${encodeURIComponent(reviewToken)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          items: action === "revision" ? capturedItems : [],
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        setSubmitError(payload.error ?? "Não foi possível enviar a resposta.")
        return
      }

      setResponseStatus(action === "approve" ? "concluido" : "desaprovado")
      setIsSubmitted(true)
    } catch (error) {
      console.error(error)
      setSubmitError("Não foi possível enviar a resposta.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = () => {
    void submitApproval("approve")
  }

  const handleRequestChanges = () => {
    if (!isRevisionMode) {
      setIsRevisionMode(true)
      setSubmitError("")
      return
    }

    if (capturedItems.length === 0) {
      setSubmitError("Adicione pelo menos um comentário na timeline antes de solicitar alterações.")
      return
    }

    void submitApproval("revision")
  }

  const captureCurrentMoment = () => {
    const nextTime = videoRef.current?.currentTime ?? currentTime
    setTimestampInput(formatTimestamp(nextTime))
  }

  const addTimelineItem = () => {
    const parsedTimestamp = parseTimestampInput(timestampInput)

    if (parsedTimestamp == null || !draftNote.trim()) {
      setSubmitError("Choose a valid timestamp and describe the requested change.")
      return
    }

    const nextItem: ReviewTimelineItem = {
      id: crypto.randomUUID(),
      timestamp: parsedTimestamp,
      note: draftNote.trim(),
      completed: false,
    }

    setCapturedItems((currentItems) =>
      [...currentItems, nextItem].sort((a, b) => a.timestamp - b.timestamp)
    )
    setDraftNote("")
    setSubmitError("")
  }

  const removeTimelineItem = (id: string) => {
    setCapturedItems((currentItems) => currentItems.filter((item) => item.id !== id))
  }

  const handleCopyPix = async () => {
    if (!review.pixKey) return
    const didCopy = await copyTextToClipboard(review.pixKey)
    if (didCopy) {
      setCopiedPix(true)
      window.setTimeout(() => setCopiedPix(false), 1500)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg border-border bg-card">
          <CardContent className="space-y-4 p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">Link indisponível</h1>
            <p className="text-muted-foreground">
              Este link de aprovação está inválido, expirou ou precisa ser gerado novamente na agenda.
            </p>
            <Link href="/" className="inline-flex">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Voltar</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted && responseStatus === "concluido") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">Vídeo aprovado</h2>
            <p className="text-center text-muted-foreground">
              Obrigado. A entrega foi marcada como concluída e o link de aprovação foi encerrado.
            </p>
            <div className="mt-6 w-full space-y-3">
              {review.priceUsd != null && (
                <div className="rounded-xl border border-border bg-background px-4 py-3 text-center text-sm text-muted-foreground">
                  Valor do projeto: <span className="font-medium text-foreground">{formatCurrency(review.priceUsd, "USD")}</span>
                </div>
              )}
              {review.pixKey && (
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-sm font-medium text-foreground">Chave Pix</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Input value={review.pixKey} readOnly className="border-border bg-card" />
                    <Button variant="outline" className="border-border" onClick={() => void handleCopyPix()}>
                      {copiedPix ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {downloadUrl && (
                <Link href={downloadUrl} target="_blank" className="block">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Download className="mr-2 h-4 w-4" />
                    Baixar vídeo
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted && responseStatus === "desaprovado") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl border-border bg-card">
          <CardContent className="space-y-6 py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                <XCircle className="h-10 w-10 text-red-400" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-foreground">Desaprovação enviada</h2>
              <p className="text-center text-muted-foreground">
                O editor foi notificado e seus comentários na timeline foram salvos.
              </p>
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-background p-4">
              {capturedItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{formatTimestamp(item.timestamp)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
      <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto mb-6 flex max-w-6xl items-center justify-between rounded-2xl border border-border bg-card/90 px-4 py-3">
        <div className="flex items-center gap-3">
          {approvalLogo ? (
            <img src={approvalLogo} alt={isStarterApproval ? "EditUp" : editor?.full_name ?? "Editor"} className="h-10 w-10 rounded-xl object-cover" />
          ) : null}
          <div>
            <p className="text-sm font-semibold text-foreground">{editor?.full_name ?? "EditUp"}</p>
            <p className="text-xs text-muted-foreground">
              {isStarterApproval ? "Central profissional de entrega por EditUp" : "Central profissional de entrega"}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {["V1", "V2", "Final"].map((version) => (
            <button
              key={version}
              type="button"
              onClick={() => setSelectedVersion(version)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedVersion === version
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {version}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.25fr,0.75fr]">
        <Card className="border-border bg-card/95 shadow-sm">
          <CardHeader>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/15">
                <Play className="h-6 w-6 text-primary" />
              </div>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                Versão {selectedVersion}
              </span>
            </div>
            <CardTitle className="text-2xl text-foreground">Revisar entrega</CardTitle>
            <CardDescription className="text-muted-foreground">
              Assista ao vídeo aqui, marque os momentos exatos e aprove quando estiver tudo certo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Projeto</span>
                <span className="text-right text-sm font-medium text-foreground">{task.titulo}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Cliente</span>
                <span className="text-right text-sm text-foreground">{task.clienteNome}</span>
              </div>
              {review.priceUsd != null && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Valor do projeto</span>
                  <span className="text-right text-sm font-medium text-foreground">
                    {formatCurrency(review.priceUsd, "USD")}
                  </span>
                </div>
              )}
              {review.pixKey && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Chave Pix</span>
                  <span className="text-right text-sm font-medium text-foreground break-all">{review.pixKey}</span>
                </div>
              )}
              {task.descricao && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Descrição</span>
                  <p className="text-sm text-foreground">{task.descricao}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-black">
                {!useEmbedFallback && directVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={directVideoUrl}
                    controls
                    className="aspect-video w-full"
                    onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    onError={() => setUseEmbedFallback(true)}
                  />
                ) : embedVideoUrl ? (
                  <iframe
                    src={embedVideoUrl}
                    title={`Vídeo de aprovação para ${task.titulo}`}
                    className="aspect-video w-full"
                    allow="autoplay"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center px-6 text-center text-sm text-white/70">
                    Não foi possível carregar o vídeo. Gere um novo link de aprovação com um arquivo válido do Drive.
                  </div>
                )}
              </div>

              {isRevisionMode && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Comentários na timeline</span>
                      <span>{formatTimestamp(currentTime)} quadro atual</span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/30"
                        style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
                      />
                      {duration > 0 &&
                        capturedItems.map((item) => (
                          <span
                            key={item.id}
                            className="absolute top-1/2 h-3 w-1.5 -translate-y-1/2 rounded-full bg-primary"
                            style={{ left: `${Math.min(100, (item.timestamp / duration) * 100)}%` }}
                          />
                        ))}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-[auto,1fr]">
                    <Button type="button" variant="outline" className="border-border" onClick={captureCurrentMoment}>
                      <PauseCircle className="mr-2 h-4 w-4" />
                      Usar tempo atual
                    </Button>
                    <Input
                      value={timestampInput}
                      onChange={(event) => setTimestampInput(event.target.value)}
                      placeholder="00:42"
                      className="border-border bg-background"
                    />
                    <div className="md:col-span-2">
                      <Label className="text-foreground">O que deve mudar neste momento?</Label>
                      <Textarea
                        value={draftNote}
                        onChange={(event) => setDraftNote(event.target.value)}
                        placeholder="Descreva exatamente a alteração pedida..."
                        className="mt-2 min-h-28 border-border bg-background"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={addTimelineItem}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar comentário na timeline
                      </Button>
                    </div>
                  </div>

                  {capturedItems.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                      <p className="text-sm font-medium text-foreground">Alterações solicitadas</p>
                      {capturedItems.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{formatTimestamp(item.timestamp)}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => removeTimelineItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                onClick={handleRequestChanges}
                disabled={isSubmitting}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {isRevisionMode ? (isSubmitting ? "Enviando..." : "Enviar pedido de ajustes") : "Pedir ajustes"}
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isSubmitting ? "Enviando..." : review.pixKey ? "Aprovar e pagar" : "Aprovar entrega"}
              </Button>
            </div>

            {isRevisionMode && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsRevisionMode(false)
                  setSubmitError("")
                }}
              >
                Voltar para aprovação
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card/95">
            <CardHeader>
              <CardTitle className="text-foreground">Editor responsável</CardTitle>
              <CardDescription className="text-muted-foreground">
                O perfil mostrado aqui ajuda o cliente a saber quem está cuidando do projeto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-foreground">{editor?.full_name ?? "Seu editor"}</p>
                <p className="text-sm text-muted-foreground">{editor?.professional_title ?? "Editor de vídeo"}</p>
              </div>
              {editor?.bio && <p className="text-sm text-muted-foreground">{editor.bio}</p>}
              {editor?.location && <p className="text-sm text-muted-foreground">{editor.location}</p>}
              {editor?.contact_value && (
                <p className="text-sm text-muted-foreground">
                  Contato: <span className="text-foreground">{editor.contact_value}</span>
                </p>
              )}
              {editor?.slug && (
                <Link
                  href={`/${editor.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  Ver perfil do editor
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/95">
            <CardHeader>
              <CardTitle className="text-foreground">Fluxo de revisão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Assista ao vídeo sem sair desta página.</p>
              <p>2. Use o quadro atual ou digite um tempo para marcar momentos exatos.</p>
              <p>3. Adicione comentários na timeline e depois aprove ou envie ajustes.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
