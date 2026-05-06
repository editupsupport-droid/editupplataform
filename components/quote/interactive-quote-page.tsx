"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, Loader2, Sparkles, UploadCloud, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  QuoteAnswers,
  QuoteBuilderConfig,
  calculateDynamicQuote,
  defaultQuoteBuilderConfig,
  getQuoteStartingPriceFromConfig,
  isQuoteQuestionVisible,
  normalizeQuoteBuilderConfig,
} from "@/lib/quote-builder"
import { formatQuoteCurrency } from "@/lib/quote-config"
import { cn } from "@/lib/utils"

type EditorPayload = {
  editor: {
    id: string
    username: string
    name: string
    title: string
    startingPrice: number
  }
  quoteBuilder?: QuoteBuilderConfig
  quotePresets?: QuoteBuilderConfig["presets"]
}

type InteractiveQuotePageProps = {
  username: string
}

export function InteractiveQuotePage({ username }: InteractiveQuotePageProps) {
  const [editorData, setEditorData] = useState<EditorPayload | null>(null)
  const [config, setConfig] = useState<QuoteBuilderConfig>(defaultQuoteBuilderConfig)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successQuote, setSuccessQuote] = useState<{ totalPrice: number; deadline: string } | null>(null)
  const [clientName, setClientName] = useState("")
  const [clientContact, setClientContact] = useState("")
  const [categoryId, setCategoryId] = useState(defaultQuoteBuilderConfig.categories[0]?.id ?? "")
  const [addOnIds, setAddOnIds] = useState<string[]>([])
  const [answers, setAnswers] = useState<QuoteAnswers>({})

  useEffect(() => {
    let ignore = false

    const loadEditor = async () => {
      try {
        setIsLoading(true)
        setError("")

        const response = await fetch(`/api/editor/${username}`, { cache: "no-store" })
        const payload = (await response.json()) as EditorPayload | { error?: string }

        if (!response.ok || !("editor" in payload)) {
          throw new Error(payload && "error" in payload ? payload.error || "Editor não encontrado." : "Editor não encontrado.")
        }

        if (!ignore) {
          const nextConfig = normalizeQuoteBuilderConfig(payload.quoteBuilder)
          setEditorData(payload)
          setConfig(nextConfig)
          setCategoryId(nextConfig.categories[0]?.id ?? "")
          setAddOnIds([])
          setAnswers({})
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar este orçamento.")
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadEditor()

    return () => {
      ignore = true
    }
  }, [username])

  const liveQuote = useMemo(
    () =>
      calculateDynamicQuote({
        config,
        categoryId,
        addOnIds,
        answers,
      }),
    [addOnIds, answers, categoryId, config]
  )

  const visibleQuestions = useMemo(
    () => config.questions.filter((question) => isQuoteQuestionVisible(question, answers, categoryId)),
    [answers, categoryId, config.questions]
  )

  const selectedCategory = config.categories.find((item) => item.id === categoryId) ?? config.categories[0]
  const availablePresets = useMemo(
    () => [...(editorData?.quotePresets ?? []), ...config.presets],
    [config.presets, editorData?.quotePresets]
  )

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }))
  }

  const handlePreset = (presetId: string) => {
    const preset = config.presets.find((item) => item.id === presetId)
      ?? editorData?.quotePresets?.find((item) => item.id === presetId)
    if (!preset) return
    const safeCategoryId = config.categories.some((category) => category.id === preset.categoryId)
      ? preset.categoryId
      : config.categories[0]?.id ?? ""
    const safeAddOnIds = preset.addOnIds.filter((id) => config.addOns.some((addOn) => addOn.id === id))
    const safeAnswers = Object.fromEntries(
      Object.entries(preset.answers ?? {}).filter(([key]) => config.questions.some((question) => question.id === key))
    )
    setCategoryId(safeCategoryId)
    setAddOnIds(safeAddOnIds)
    setAnswers((current) => ({ ...current, ...safeAnswers }))
  }

  const handleSubmit = async () => {
    if (!editorData) return

    const missingQuestion = visibleQuestions.find((question) => {
      if (!question.required) return false
      const answer = answers[question.id]
      return Array.isArray(answer) ? answer.length === 0 : !String(answer ?? "").trim()
    })

    if (missingQuestion) {
      setError(`Preencha: ${missingQuestion.label}`)
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      setSuccessQuote(null)

      const response = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          editorId: editorData.editor.id,
          clientName,
          clientContact,
          categoryId,
          addOnIds,
          answers,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        quoteRequest?: { totalPrice: number; deadline: string }
      }

      if (!response.ok || !payload.quoteRequest) {
        throw new Error(payload.error || "Não foi possível enviar a solicitação.")
      }

      setSuccessQuote({
        totalPrice: payload.quoteRequest.totalPrice,
        deadline: payload.quoteRequest.deadline,
      })
      setClientName("")
      setClientContact("")
      setAddOnIds([])
      setAnswers({})
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível enviar a solicitação.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white px-4 py-16 text-zinc-950 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex min-h-[220px] items-center justify-center">
            <div className="flex items-center gap-3 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando orçamento...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!editorData) {
    return (
      <div className="min-h-screen bg-white px-4 py-16 text-zinc-950 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-semibold">Editor não encontrado</p>
          <p className="mt-2 text-sm text-zinc-500">Confira o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-10 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="mb-4 inline-flex rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-normal text-zinc-600">
              Orçamento inteligente
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-zinc-950 md:text-6xl">
              {config.introTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
              {config.introDescription}
            </p>
          </div>
          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-sm text-zinc-500">Editor</p>
            <p className="mt-1 text-xl font-semibold">{editorData.editor.name}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {editorData.editor.title} • A partir de {formatQuoteCurrency(getQuoteStartingPriceFromConfig(config))}
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            {availablePresets.length > 0 ? (
              <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
                <Label className="text-zinc-950">Templates do editor</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availablePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePreset(preset.id)}
                      className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                      title={preset.description}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm md:p-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">1</span>
                <div>
                  <h2 className="text-xl font-semibold">Escolha o tipo de projeto</h2>
                  <p className="text-sm text-zinc-500">Essa escolha define o preço base.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {config.categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      categoryId === category.id
                        ? "border-zinc-900 bg-zinc-100"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{category.label}</p>
                        <p className="mt-1 text-sm leading-6 text-zinc-500">{category.description}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-zinc-950">{formatQuoteCurrency(category.basePrice)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm md:p-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">2</span>
                <div>
                  <h2 className="text-xl font-semibold">Adicionais</h2>
                  <p className="text-sm text-zinc-500">O resumo atualiza no mesmo instante.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {config.addOns.map((addOn) => (
                  <label
                    key={addOn.id}
                    className={cn(
                      "cursor-pointer rounded-lg border p-4 transition-colors",
                      addOnIds.includes(addOn.id) ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Checkbox
                        checked={addOnIds.includes(addOn.id)}
                        onCheckedChange={(checked) => {
                          setAddOnIds((current) =>
                            checked === true
                              ? [...new Set([...current, addOn.id])]
                              : current.filter((id) => id !== addOn.id)
                          )
                        }}
                      />
                      <span className="text-sm font-semibold">+{formatQuoteCurrency(addOn.price)}</span>
                    </div>
                    <p className="mt-3 font-medium">{addOn.label}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">{addOn.description}</p>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm md:p-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">3</span>
                <div>
                  <h2 className="text-xl font-semibold">Briefing</h2>
                  <p className="text-sm text-zinc-500">Perguntas condicionais aparecem só quando fazem sentido.</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-zinc-950">Seu nome</Label>
                    <Input
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                      placeholder="Digite seu nome"
                      className="border-zinc-300 bg-white text-zinc-950"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-950">Seu contato</Label>
                    <Input
                      value={clientContact}
                      onChange={(event) => setClientContact(event.target.value)}
                      placeholder="E-mail ou WhatsApp"
                      className="border-zinc-300 bg-white text-zinc-950"
                    />
                  </div>
                </div>

                {visibleQuestions.map((question) => (
                  <div key={question.id} className="animate-in fade-in slide-in-from-bottom-2 space-y-2 duration-300">
                    <Label className="text-zinc-950">
                      {question.label}
                      {question.required ? <span className="text-zinc-950"> *</span> : null}
                    </Label>
                    {question.type === "short-text" || question.type === "upload-reference" ? (
                      <div className="relative">
                        {question.type === "upload-reference" ? (
                          <UploadCloud className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        ) : null}
                        <Input
                          type={question.id === config.minutePricing.questionId ? "number" : "text"}
                          min={question.id === config.minutePricing.questionId ? 1 : undefined}
                          inputMode={question.id === config.minutePricing.questionId ? "numeric" : undefined}
                          value={String(answers[question.id] ?? "")}
                          onChange={(event) => setAnswer(question.id, event.target.value)}
                          placeholder={question.placeholder}
                          className={cn(
                            "border-zinc-300 bg-white text-zinc-950",
                            question.type === "upload-reference" && "pl-9",
                            question.id === config.minutePricing.questionId && "pr-12"
                          )}
                        />
                        {question.id === config.minutePricing.questionId ? (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500">
                            min
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {question.type === "long-text" ? (
                      <Textarea
                        rows={4}
                        value={String(answers[question.id] ?? "")}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                        placeholder={question.placeholder}
                        className="border-zinc-300 bg-white text-zinc-950"
                      />
                    ) : null}
                    {question.type === "multi-select" ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(question.options ?? []).map((option) => {
                          const current = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : []
                          return (
                            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm">
                              <Checkbox
                                checked={current.includes(option)}
                                onCheckedChange={(checked) => {
                                  setAnswer(
                                    question.id,
                                    checked === true
                                      ? [...new Set([...current, option])]
                                      : current.filter((item) => item !== option)
                                  )
                                }}
                              />
                              {option}
                            </label>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            {successQuote ? (
              <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6" />
                  <p className="text-lg font-semibold">Obrigado. Seu orçamento foi enviado.</p>
                </div>
                <p className="mt-2 text-sm">
                  Resumo enviado para o editor: {formatQuoteCurrency(successQuote.totalPrice)} • {successQuote.deadline}.
                </p>
              </div>
            ) : null}
          </main>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card className="border-zinc-200 bg-zinc-950 text-white shadow-[0_24px_80px_rgba(9,9,11,0.24)]">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-white">Resumo em tempo real</CardTitle>
                <CardDescription className="text-zinc-400">
                  Cálculo estimado. O servidor recalcula tudo antes de salvar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Wallet className="h-4 w-4" />
                    Valor total
                  </div>
                  <p className="mt-3 text-4xl font-semibold text-white">{formatQuoteCurrency(liveQuote.totalPrice)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Clock3 className="h-4 w-4" />
                    Prazo estimado
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">{liveQuote.deadline}</p>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-300">
                  <p className="font-medium text-white">{selectedCategory?.label}</p>
                  {liveQuote.breakdown.addOns.length ? (
                    liveQuote.breakdown.addOns.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3">
                        <span>{item.label}</span>
                        <span>+{formatQuoteCurrency(item.price)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-500">Sem adicionais selecionados.</p>
                  )}
                  {liveQuote.breakdown.minutePricing && liveQuote.breakdown.minutePricing.minutes > 0 ? (
                    <div className="flex justify-between gap-3">
                      <span>{liveQuote.breakdown.minutePricing.minutes} min de vídeo</span>
                      <span>+{formatQuoteCurrency(liveQuote.breakdown.minutePricing.price)}</span>
                    </div>
                  ) : null}
                  {liveQuote.breakdown.multipliers.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3 text-zinc-300">
                      <span>{item.label}</span>
                      <span>{item.multiplier}x</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting || !clientName.trim() || !clientContact.trim()}
                  className="h-12 w-full bg-zinc-900 text-white hover:bg-zinc-800"
                >
                  {isSubmitting ? "Enviando..." : "Enviar orçamento"}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
