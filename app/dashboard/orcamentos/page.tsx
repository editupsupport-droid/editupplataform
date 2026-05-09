"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Copy, ExternalLink, FileText, FolderKanban, Inbox, Sparkles } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"
import { authFetch } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageLoadingState } from "@/components/dashboard/page-loading-state"
import { PageEmptyState } from "@/components/dashboard/page-empty-state"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { QUOTE_DURATIONS, QUOTE_LEVELS, QUOTE_VIDEO_TYPES, formatQuoteCurrency } from "@/lib/quote-config"
import { Button } from "@/components/ui/button"
import {
  createFinanceTransaction,
  createWorkspaceTask,
  fetchWorkspaceClients,
  upsertWorkspaceClient,
} from "@/lib/workspace-db"
import { createDefaultClientProfile, createDefaultTaskChecklist, createDefaultTaskScope } from "@/lib/workflow-insights"
import { copyTextToClipboard } from "@/lib/clipboard"

type QuoteItem = {
  id: string
  clientName: string
  clientContact: string
  videoType: string
  duration: string
  level: string
  extras?: {
    kind?: string
    categoryLabel?: string
    levelLabel?: string
    addOnLabels?: string[]
    pricingBreakdown?: {
      category?: { label?: string }
      addOns?: Array<{ label: string; price: number }>
      minutePricing?: { minutes: number; extraMinutes: number; price: number }
      multipliers?: Array<{ label: string; multiplier: number }>
    }
  }
  pricingBreakdown?: {
    category?: { label?: string }
    addOns?: Array<{ label: string; price: number }>
    minutePricing?: { minutes: number; extraMinutes: number; price: number }
    multipliers?: Array<{ label: string; multiplier: number }>
  }
  calculatedPrice?: number
  manualAdjustment?: number
  editorMessage?: string
  finalizedAt?: string | null
  totalPrice: number
  deadline: string
  status: string
  createdAt: string
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))

const getLabel = (options: ReadonlyArray<{ value: string; label: string }>, value: string) =>
  options.find((item) => item.value === value)?.label ?? value

const getQuoteVideoLabel = (quote: QuoteItem) =>
  quote.extras?.categoryLabel ?? quote.pricingBreakdown?.category?.label ?? quote.extras?.pricingBreakdown?.category?.label ?? getLabel(QUOTE_VIDEO_TYPES, quote.videoType)

const getQuoteLevelLabel = (quote: QuoteItem) =>
  quote.extras?.levelLabel ?? getLabel(QUOTE_LEVELS, quote.level)

const CONVERTED_QUOTES_KEY = "editup-converted-quotes"

const getConvertedQuoteIds = () => {
  if (typeof window === "undefined") return []

  try {
    return JSON.parse(window.localStorage.getItem(CONVERTED_QUOTES_KEY) ?? "[]") as string[]
  } catch {
    return []
  }
}

const saveConvertedQuoteIds = (ids: string[]) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CONVERTED_QUOTES_KEY, JSON.stringify([...new Set(ids)]))
}

export default function OrcamentosPage() {
  const { currentUser } = useAppSession()
  const [quotes, setQuotes] = useState<QuoteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [convertedQuoteIds, setConvertedQuoteIds] = useState<string[]>([])
  const [convertingId, setConvertingId] = useState("")
  const [reviewingId, setReviewingId] = useState("")

  useEffect(() => {
    if (!currentUser) return

    const loadQuotes = async () => {
      try {
        setIsLoading(true)
        setError("")

        const response = await authFetch("/api/quote")
        const payload = (await response.json()) as { quotes?: QuoteItem[]; error?: string }

        if (!response.ok) {
          throw new Error(payload.error || "Não foi possível carregar os orçamentos.")
        }

        const nextQuotes = payload.quotes ?? []
        setQuotes(nextQuotes)
        setConvertedQuoteIds(getConvertedQuoteIds())
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os orçamentos.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadQuotes()
  }, [currentUser])

  if (!currentUser) return null

  const publicQuoteLink =
    typeof window !== "undefined" ? `${window.location.origin}/orcamento/${currentUser.profile.slug}` : ""
  const publicProfileLink = currentUser.profile.slug ? `/${currentUser.profile.slug}` : ""

  const handleCopyLink = async () => {
    if (!publicQuoteLink) return
    const didCopy = await copyTextToClipboard(publicQuoteLink)
    if (!didCopy) {
      setError("Não foi possível copiar automaticamente. Selecione o link e copie manualmente.")
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const estimateDueDate = (deadline: string) => {
    const number = Number(deadline.match(/\d+/)?.[0] ?? "7")
    const dueDate = new Date()

    if (/h|hora/i.test(deadline)) {
      dueDate.setHours(dueDate.getHours() + number)
    } else {
      dueDate.setDate(dueDate.getDate() + number)
    }

    return dueDate.toISOString()
  }

  const handleConvertQuote = async (quote: QuoteItem) => {
    if (!currentUser || convertingId) return

    setConvertingId(quote.id)
    setError("")

    try {
      const existingClients = await fetchWorkspaceClients(currentUser.id, { force: true })
      const normalizedName = quote.clientName.trim().toLocaleLowerCase("pt-BR")
      const existingClient = existingClients.find((client) => client.nome.trim().toLocaleLowerCase("pt-BR") === normalizedName)
      const contactDigits = quote.clientContact.replace(/\D/g, "")
      const client =
        existingClient ??
        (await upsertWorkspaceClient(currentUser.id, {
          id: "",
          nome: quote.clientName.trim(),
          fotoUrl: "",
          telefone: contactDigits || quote.clientContact.trim(),
          codigoPais: "+55",
          nivelEdicao: quote.level === "premium" ? "profissional" : quote.level === "profissional" ? "medio" : "simples",
          duracaoMedia: 15,
          frequencia: "sem-frequencia",
          linkDrive: "",
          driveFolderId: "",
          driveFolderName: "",
          createdAt: new Date().toISOString(),
          perfilOperacional: {
          ...createDefaultClientProfile(),
            tipoConteudo: getQuoteVideoLabel(quote),
            prazoHabitual: quote.deadline,
            observacoes: `Criado a partir do orçamento ${quote.id}. Contato: ${quote.clientContact}`,
          },
        }))

      const task = await createWorkspaceTask(currentUser.id, {
        titulo: `${getQuoteVideoLabel(quote)} - ${quote.clientName}`,
        descricao: `Orçamento convertido automaticamente. Contato: ${quote.clientContact}`,
        clienteId: client.id,
        clienteNome: client.nome,
        prazo: estimateDueDate(quote.deadline),
        checklist: {
          ...createDefaultTaskChecklist(),
          briefingRecebido: true,
          formatoDefinido: true,
          prazoConfirmado: true,
          pagamentoAlinhado: true,
        },
        escopo: {
          ...createDefaultTaskScope(),
          quantidadeVideos: "1 vídeo",
          duracaoEsperada: getLabel(QUOTE_DURATIONS, quote.duration),
          formatos: getQuoteVideoLabel(quote),
          revisoesIncluidas: "2 revisões",
          valorCombinado: formatQuoteCurrency(quote.totalPrice),
          prazoPrometido: quote.deadline,
        },
      })

      await createFinanceTransaction(currentUser.id, {
        tipo: "entrada",
        valor: quote.totalPrice,
        descricao: `Receita prevista - ${task.titulo}`,
        categoria: "Receita prevista",
        cliente: client.nome,
        data: new Date().toISOString(),
      })

      const nextConvertedIds = [...convertedQuoteIds, quote.id]
      saveConvertedQuoteIds(nextConvertedIds)
      setConvertedQuoteIds(nextConvertedIds)
    } catch (error) {
      console.error(error)
      setError(error instanceof Error ? error.message : "Não foi possível converter o orçamento em projeto.")
    } finally {
      setConvertingId("")
    }
  }

  const generateProposalLink = (quote: QuoteItem) => {
    try {
      if (quote.status !== "finalizado") {
        setError("Finalize a revisão antes de gerar o link da proposta.")
        return
      }

      setError("")
      const escapeHtml = (value: string) =>
        value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      const addOns = quote.extras?.addOnLabels?.length ? quote.extras.addOnLabels.join(", ") : getQuoteLevelLabel(quote)
      const editorMessage = quote.editorMessage?.trim()
      const proposalHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta - ${escapeHtml(quote.clientName)}</title>
  <style>
    body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f6f7fb; color: #111827; }
    main { max-width: 760px; margin: 40px auto; background: white; border: 1px solid #e5e7eb; border-radius: 22px; padding: 34px; }
    img { width: 54px; height: 54px; border-radius: 16px; object-fit: cover; }
    h1 { margin: 22px 0 8px; font-size: 32px; letter-spacing: 0; }
    .muted { color: #6b7280; line-height: 1.7; }
    .price { margin: 26px 0; font-size: 46px; font-weight: 700; color: #37352F; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 26px; }
    .item { border: 1px solid #e5e7eb; border-radius: 14px; padding: 15px; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0; }
    .value { margin-top: 6px; font-weight: 700; }
    @media print { body { background: white; } main { margin: 0; border: 0; } }
  </style>
</head>
<body>
  <main>
    <img src="${window.location.origin}/logo.jpeg" alt="EditUp" />
    <h1>Proposta de edição de vídeo</h1>
    <p class="muted">Resumo profissional gerado a partir do orçamento solicitado por ${escapeHtml(quote.clientName)}.</p>
    ${editorMessage ? `<p class="muted" style="border-left: 3px solid #37352F; padding-left: 14px;">${escapeHtml(editorMessage)}</p>` : ""}
    <div class="price">${formatQuoteCurrency(quote.totalPrice)}</div>
    <div class="grid">
      <div class="item"><div class="label">Cliente</div><div class="value">${escapeHtml(quote.clientName)}</div></div>
      <div class="item"><div class="label">Projeto</div><div class="value">${escapeHtml(getQuoteVideoLabel(quote))}</div></div>
      <div class="item"><div class="label">Prazo</div><div class="value">${escapeHtml(quote.deadline)}</div></div>
      <div class="item"><div class="label">Adicionais</div><div class="value">${escapeHtml(addOns)}</div></div>
    </div>
    <p class="muted" style="margin-top: 28px; font-size: 13px;">Valores podem ser ajustados após análise de arquivos, referências e escopo final.</p>
  </main>
</body>
</html>`
      const blob = new Blob([proposalHtml], { type: "text/html;charset=utf-8" })
      const url = window.URL.createObjectURL(blob)
      const opened = window.open(url, "_blank", "noopener,noreferrer")
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000)

      if (!opened) {
        setError("O navegador bloqueou a abertura da proposta. Permita pop-ups para visualizar o link.")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível gerar a proposta.")
    }
  }

  const finalizeQuoteReview = async (quote: QuoteItem) => {
    const draft = { manualAdjustment: quote.manualAdjustment ?? 0, editorMessage: quote.editorMessage ?? "" }
    try {
      setReviewingId(quote.id)
      setError("")
      const response = await authFetch("/api/quote", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: quote.id,
          manualAdjustment: draft.manualAdjustment,
          editorMessage: draft.editorMessage,
          status: "finalizado",
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { quote?: Partial<QuoteItem>; error?: string }
      if (!response.ok || !payload.quote) {
        throw new Error(payload.error ?? "Não foi possível finalizar o orçamento.")
      }
      setQuotes((current) => current.map((item) =>
        item.id === quote.id
          ? {
              ...item,
              totalPrice: Number(payload.quote?.totalPrice ?? item.totalPrice),
              calculatedPrice: Number(payload.quote?.calculatedPrice ?? item.calculatedPrice ?? item.totalPrice),
              manualAdjustment: Number(payload.quote?.manualAdjustment ?? draft.manualAdjustment),
              editorMessage: String(payload.quote?.editorMessage ?? draft.editorMessage),
              status: String(payload.quote?.status ?? "finalizado"),
              finalizedAt: payload.quote?.finalizedAt ?? new Date().toISOString(),
            }
          : item
      ))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível finalizar o orçamento.")
    } finally {
      setReviewingId("")
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
        <h1 className="text-3xl font-semibold text-foreground">Orçamentos</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Receba pedidos pelo link público, revise o valor final e transforme em projeto.
        </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {publicProfileLink ? (
            <Button type="button" variant="outline" asChild>
              <Link href={publicProfileLink} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver perfil do editor
              </Link>
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void handleCopyLink()}>
            {copied ? <Check className="mr-2 h-4 w-4 text-primary" /> : <Copy className="mr-2 h-4 w-4" />}
            Copiar link público
          </Button>
        </div>
      </div>

      <FeedbackBanner message={error} type="error" />

      {isLoading ? (
        <PageLoadingState
          title="Carregando orçamentos"
          description="Estamos buscando as solicitações mais recentes enviadas para você."
        />
      ) : quotes.length === 0 ? (
        <PageEmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="Ainda não há pedidos de orçamento"
          description="Copie o link do seu orçamento público e envie para os clientes. Os pedidos recebidos aparecem aqui."
        />
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card key={quote.id} className="border-border bg-card">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-xl text-foreground">{quote.clientName}</CardTitle>
                  <CardDescription className="mt-1 text-muted-foreground">
                    {quote.clientContact}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {quote.status === "finalizado" ? "Finalizado" : "Draft"}
                  </span>
                  <span className="text-sm text-muted-foreground">{formatDate(quote.createdAt)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Vídeo</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {getQuoteVideoLabel(quote)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Duração</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {(quote.pricingBreakdown?.minutePricing ?? quote.extras?.pricingBreakdown?.minutePricing)?.minutes
                      ? `${(quote.pricingBreakdown?.minutePricing ?? quote.extras?.pricingBreakdown?.minutePricing)?.minutes} min`
                      : getLabel(QUOTE_DURATIONS, quote.duration)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prazo</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{quote.deadline}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Valor</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatQuoteCurrency(quote.totalPrice)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pacote</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {getQuoteLevelLabel(quote)}
                  </p>
                </div>
                </div>
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resumo</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Valor calculado: <span className="font-medium text-foreground">{formatQuoteCurrency(quote.calculatedPrice ?? quote.totalPrice)}</span>
                      {quote.manualAdjustment ? (
                        <> • Ajuste: <span className="font-medium text-foreground">{formatQuoteCurrency(quote.manualAdjustment)}</span></>
                      ) : null}
                    </p>
                    {quote.editorMessage ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{quote.editorMessage}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {quote.status !== "finalizado" ? (
                      <Button
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={reviewingId === quote.id}
                        onClick={() => void finalizeQuoteReview(quote)}
                      >
                        {reviewingId === quote.id ? "Finalizando..." : "Finalizar e enviar"}
                      </Button>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                        Finalizado
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Fluxo inteligente</p>
                      <p className="text-xs text-muted-foreground">
                        Cria cliente, card no Kanban e receita prevista no financeiro.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" className="border-border" onClick={() => generateProposalLink(quote)} disabled={quote.status !== "finalizado"}>
                      <FileText className="mr-2 h-4 w-4" />
                      Gerar proposta PDF
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleConvertQuote(quote)}
                      disabled={quote.status !== "finalizado" || convertedQuoteIds.includes(quote.id) || convertingId === quote.id}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {convertedQuoteIds.includes(quote.id) ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Convertido
                        </>
                      ) : (
                        <>
                          <FolderKanban className="mr-2 h-4 w-4" />
                          {convertingId === quote.id ? "Convertendo..." : "Aprovar e criar projeto"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
