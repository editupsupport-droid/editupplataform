"use client"

import { useEffect, useMemo, useState } from "react"
import type React from "react"
import { Check, GripVertical, Layers, Loader2, Pencil, Plus, Save, Trash2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { authFetch } from "@/lib/supabase"
import {
  QuoteBuilderConfig,
  QuotePreset,
  QuoteQuestion,
  calculateDynamicQuote,
  createQuoteId,
  defaultQuoteBuilderConfig,
  formatQuoteBreakdownForNotes,
  isQuoteQuestionVisible,
  normalizeQuoteBuilderConfig,
  quoteQuestionTypes,
} from "@/lib/quote-builder"
import { formatQuoteCurrency } from "@/lib/quote-config"
import { cn } from "@/lib/utils"

const questionTypeLabels: Record<QuoteQuestion["type"], string> = {
  "short-text": "Texto curto",
  "long-text": "Texto longo",
  "multi-select": "Seleção múltipla",
  "upload-reference": "Upload/referência",
}

const cloneConfig = (config: QuoteBuilderConfig): QuoteBuilderConfig =>
  JSON.parse(JSON.stringify(config)) as QuoteBuilderConfig

const toNumber = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function QuoteBuilderSettings() {
  const [config, setConfig] = useState<QuoteBuilderConfig>(defaultQuoteBuilderConfig)
  const [libraryPresets, setLibraryPresets] = useState<QuotePreset[]>([])
  const [presetDraft, setPresetDraft] = useState<QuotePreset>({
    id: "",
    label: "Pack Infoproduto Gold",
    description: "Vídeo de vendas com thumbnail, trilha e acabamento premium.",
    categoryId: defaultQuoteBuilderConfig.categories[1]?.id ?? "pro",
    addOnIds: ["thumbnail", "trilha"],
    answers: {},
    manualAdjustment: 0,
    clientMessage: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPresetSaving, setIsPresetSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [draggedQuestionId, setDraggedQuestionId] = useState("")
  const [previewCategoryId, setPreviewCategoryId] = useState(defaultQuoteBuilderConfig.categories[0]?.id ?? "")
  const [previewAddOnIds, setPreviewAddOnIds] = useState<string[]>(["thumbnail"])
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string | string[]>>({
    "minutos-video": "3",
  })

  useEffect(() => {
    let ignore = false

    const loadConfig = async () => {
      try {
        setIsLoading(true)
        const [builderResponse, presetsResponse] = await Promise.all([
          authFetch("/api/quote-builder", { cache: "no-store" }),
          authFetch("/api/quote-presets", { cache: "no-store" }),
        ])
        const payload = (await builderResponse.json().catch(() => ({}))) as { config?: QuoteBuilderConfig; error?: string }
        const presetsPayload = (await presetsResponse.json().catch(() => ({}))) as { presets?: Array<{
          id: string
          name: string
          description: string
          categoryId: string
          addOnIds: string[]
          answers: Record<string, string | string[]>
          manualAdjustment: number
          clientMessage: string
        }>; error?: string }
        if (!builderResponse.ok || !payload.config) {
          throw new Error(payload.error ?? "Não foi possível carregar o construtor.")
        }

        if (!ignore) {
          const nextConfig = normalizeQuoteBuilderConfig(payload.config)
          const nextPresets = (presetsPayload.presets ?? []).map((preset) => ({
            id: preset.id,
            label: preset.name,
            description: preset.description,
            categoryId: preset.categoryId,
            addOnIds: preset.addOnIds,
            answers: preset.answers,
            manualAdjustment: preset.manualAdjustment,
            clientMessage: preset.clientMessage,
          }))
          setConfig(nextConfig)
          setLibraryPresets(nextPresets)
          setPreviewCategoryId(nextConfig.categories[0]?.id ?? "")
          setPreviewAddOnIds(nextConfig.addOns[0]?.id ? [nextConfig.addOns[0].id] : [])
          setPreviewAnswers({ [nextConfig.minutePricing.questionId]: "3" })
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error instanceof Error ? error.message : "Não foi possível carregar o construtor.")
        }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    void loadConfig()

    return () => {
      ignore = true
    }
  }, [])

  const previewQuote = useMemo(
    () =>
      calculateDynamicQuote({
        config,
        categoryId: previewCategoryId || config.categories[0]?.id || "",
        addOnIds: previewAddOnIds,
        answers: previewAnswers,
      }),
    [config, previewAddOnIds, previewAnswers, previewCategoryId]
  )

  const visiblePreviewQuestions = useMemo(
    () => config.questions.filter((question) => isQuoteQuestionVisible(question, previewAnswers, previewCategoryId)),
    [config.questions, previewAnswers, previewCategoryId]
  )

  const updateConfig = (updater: (draft: QuoteBuilderConfig) => void) => {
    setConfig((current) => {
      const draft = cloneConfig(current)
      updater(draft)
      return draft
    })
  }

  const saveConfig = async () => {
    try {
      setIsSaving(true)
      setMessage("")
      const response = await authFetch("/api/quote-builder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })
      const payload = (await response.json().catch(() => ({}))) as { config?: QuoteBuilderConfig; error?: string }
      if (!response.ok || !payload.config) {
        throw new Error(payload.error ?? "Não foi possível salvar o construtor.")
      }

      setConfig(normalizeQuoteBuilderConfig(payload.config))
      setMessage("Construtor salvo. O formulário público já usa estas regras.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o construtor.")
    } finally {
      setIsSaving(false)
    }
  }

  const savePreset = async () => {
    try {
      setIsPresetSaving(true)
      setMessage("")
      const response = await authFetch("/api/quote-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: presetDraft.id || undefined,
          name: presetDraft.label,
          description: presetDraft.description ?? "",
          categoryId: presetDraft.categoryId || config.categories[0]?.id,
          addOnIds: presetDraft.addOnIds,
          answers: presetDraft.answers ?? previewAnswers,
          manualAdjustment: presetDraft.manualAdjustment ?? 0,
          clientMessage: presetDraft.clientMessage ?? "",
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { preset?: {
        id: string
        name: string
        description: string
        categoryId: string
        addOnIds: string[]
        answers: Record<string, string | string[]>
        manualAdjustment: number
        clientMessage: string
      }; error?: string }

      if (!response.ok || !payload.preset) {
        throw new Error(payload.error ?? "Não foi possível salvar o preset.")
      }

      const nextPreset: QuotePreset = {
        id: payload.preset.id,
        label: payload.preset.name,
        description: payload.preset.description,
        categoryId: payload.preset.categoryId,
        addOnIds: payload.preset.addOnIds,
        answers: payload.preset.answers,
        manualAdjustment: payload.preset.manualAdjustment,
        clientMessage: payload.preset.clientMessage,
      }

      setLibraryPresets((current) => {
        const withoutCurrent = current.filter((item) => item.id !== nextPreset.id)
        return [nextPreset, ...withoutCurrent]
      })
      setPresetDraft({ ...nextPreset, id: "" })
      setMessage("Preset salvo na biblioteca.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o preset.")
    } finally {
      setIsPresetSaving(false)
    }
  }

  const deletePreset = async (presetId: string) => {
    try {
      const response = await authFetch(`/api/quote-presets?id=${encodeURIComponent(presetId)}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? "Não foi possível remover o preset.")
      }
      setLibraryPresets((current) => current.filter((item) => item.id !== presetId))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível remover o preset.")
    }
  }

  const loadPresetInSimulator = (preset: QuotePreset) => {
    const safeCategoryId = config.categories.some((category) => category.id === preset.categoryId)
      ? preset.categoryId
      : config.categories[0]?.id ?? ""
    const safeAddOnIds = preset.addOnIds.filter((id) => config.addOns.some((addOn) => addOn.id === id))
    const safeAnswers = Object.fromEntries(
      Object.entries(preset.answers ?? {}).filter(([key]) => config.questions.some((question) => question.id === key))
    )
    setPreviewCategoryId(safeCategoryId)
    setPreviewAddOnIds(safeAddOnIds)
    setPreviewAnswers(safeAnswers)
    setPresetDraft({ ...preset, categoryId: safeCategoryId, addOnIds: safeAddOnIds, answers: safeAnswers })
  }

  const addQuestion = () => {
    updateConfig((draft) => {
      draft.questions.push({
        id: createQuoteId("pergunta"),
        label: "Nova pergunta",
        type: "short-text",
        required: false,
        placeholder: "",
        options: [],
      })
    })
  }

  const moveQuestion = (fromId: string, toId: string) => {
    if (!fromId || fromId === toId) return
    updateConfig((draft) => {
      const fromIndex = draft.questions.findIndex((item) => item.id === fromId)
      const toIndex = draft.questions.findIndex((item) => item.id === toId)
      if (fromIndex < 0 || toIndex < 0) return
      const [item] = draft.questions.splice(fromIndex, 1)
      draft.questions.splice(toIndex, 0, item)
    })
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex min-h-[260px] items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando construtor de orçamentos...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Quote Builder</p>
            <CardTitle className="mt-2 text-2xl">Construtor modular de orçamentos</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Defina perguntas, categorias, adicionais, cálculo por minuto, multiplicadores e presets. O valor final sempre é recalculado no backend.
            </CardDescription>
          </div>
          <Button onClick={() => void saveConfig()} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Salvando..." : "Salvar builder"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Título público</Label>
                <Input value={config.introTitle} onChange={(event) => updateConfig((draft) => { draft.introTitle = event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição pública</Label>
                <Input value={config.introDescription} onChange={(event) => updateConfig((draft) => { draft.introDescription = event.target.value })} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">Módulos de briefing</h3>
                  <p className="text-sm text-muted-foreground">Arraste os blocos para reorganizar o fluxo do cliente.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="mr-2 h-4 w-4" />
                  Pergunta
                </Button>
              </div>

              <div className="space-y-3">
                {config.questions.map((question, index) => (
                  <div
                    key={question.id}
                    draggable
                    onDragStart={() => setDraggedQuestionId(question.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveQuestion(draggedQuestionId, question.id)}
                    className={cn(
                      "rounded-xl border border-border bg-card p-4 transition-colors",
                      draggedQuestionId === question.id && "border-primary/60"
                    )}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">#{index + 1}</span>
                      <Input
                        value={question.label}
                        onChange={(event) => updateConfig((draft) => { draft.questions[index].label = event.target.value })}
                        className="h-9"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => updateConfig((draft) => { draft.questions.splice(index, 1) })}
                        disabled={config.questions.length <= 1}
                        aria-label="Remover pergunta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={question.type}
                          onValueChange={(value) => updateConfig((draft) => { draft.questions[index].type = value as QuoteQuestion["type"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {quoteQuestionTypes.map((type) => (
                              <SelectItem key={type} value={type}>{questionTypeLabels[type]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Placeholder/opções</Label>
                        <Input
                          value={question.type === "multi-select" ? (question.options ?? []).join(", ") : question.placeholder ?? ""}
                          onChange={(event) => updateConfig((draft) => {
                            if (draft.questions[index].type === "multi-select") {
                              draft.questions[index].options = event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                            } else {
                              draft.questions[index].placeholder = event.target.value
                            }
                          })}
                          placeholder={question.type === "multi-select" ? "Opção 1, Opção 2" : "Texto de apoio"}
                        />
                      </div>
                      <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
                        <Checkbox
                          checked={question.required}
                          onCheckedChange={(checked) => updateConfig((draft) => { draft.questions[index].required = checked === true })}
                        />
                        Obrigatória
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Condição</Label>
                        <Select
                          value={question.conditional?.questionId ?? "always"}
                          onValueChange={(value) => updateConfig((draft) => {
                            draft.questions[index].conditional = value === "always"
                              ? undefined
                              : { questionId: value, operator: "equals", value: "" }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="always">Sempre mostrar</SelectItem>
                            <SelectItem value="__category">Categoria escolhida</SelectItem>
                            {config.questions.filter((item) => item.id !== question.id).map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Operador</Label>
                        <Select
                          value={question.conditional?.operator ?? "equals"}
                          disabled={!question.conditional}
                          onValueChange={(value) => updateConfig((draft) => {
                            if (draft.questions[index].conditional) draft.questions[index].conditional.operator = value as "equals" | "contains"
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">é igual a</SelectItem>
                            <SelectItem value="contains">contém</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor</Label>
                        <Input
                          disabled={!question.conditional}
                          value={question.conditional?.value ?? ""}
                          onChange={(event) => updateConfig((draft) => {
                            if (draft.questions[index].conditional) draft.questions[index].conditional.value = event.target.value
                          })}
                          placeholder="Ex: reels"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Wand2 className="h-4 w-4" />
                Simulador
              </div>
              <p className="mt-3 text-3xl font-semibold text-foreground">{formatQuoteCurrency(previewQuote.totalPrice)}</p>
              <p className="text-sm text-muted-foreground">{previewQuote.deadline}</p>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background/70 p-3 text-xs text-muted-foreground">
                {formatQuoteBreakdownForNotes(previewQuote.breakdown)}
              </pre>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <Label>Categoria de teste</Label>
              <Select value={previewCategoryId} onValueChange={setPreviewCategoryId}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-4 space-y-2">
                <Label>Adicionais ativos</Label>
                {config.addOns.map((addOn) => (
                  <label key={addOn.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={previewAddOnIds.includes(addOn.id)}
                      onCheckedChange={(checked) => {
                        setPreviewAddOnIds((current) =>
                          checked === true ? [...new Set([...current, addOn.id])] : current.filter((id) => id !== addOn.id)
                        )
                      }}
                    />
                    {addOn.label}
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Perguntas visíveis no teste: {visiblePreviewQuestions.map((item) => item.label).join(", ")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <BuilderList
          title="Escolha seu tipo de projeto"
          description="Tipos que o cliente verá no início do orçamento. Nome, descrição, valor e prazo são editáveis."
          items={config.categories}
          addLabel="Adicionar tipo de projeto"
          onAdd={() => updateConfig((draft) => { draft.categories.push({ id: createQuoteId("projeto"), label: "Novo tipo de projeto", description: "Descreva o escopo deste projeto.", basePrice: 50, baseDays: 3 }) })}
          renderItem={(category, index) => (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome do tipo</Label>
                <Input value={category.label} onChange={(event) => updateConfig((draft) => { draft.categories[index].label = event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={category.description ?? ""} onChange={(event) => updateConfig((draft) => { draft.categories[index].description = event.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Valor base</Label>
                  <Input type="number" value={category.basePrice} onChange={(event) => updateConfig((draft) => { draft.categories[index].basePrice = toNumber(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Prazo em dias</Label>
                  <Input type="number" value={category.baseDays} onChange={(event) => updateConfig((draft) => { draft.categories[index].baseDays = toNumber(event.target.value) })} />
                </div>
              </div>
            </div>
          )}
          onRemove={(index) => updateConfig((draft) => { if (draft.categories.length > 1) draft.categories.splice(index, 1) })}
        />

        <BuilderList
          title="Adicionar adicionais"
          description="Extras que o cliente pode marcar. Nome, descrição, preço e prazo são editáveis."
          items={config.addOns}
          addLabel="Adicionar adicional"
          onAdd={() => updateConfig((draft) => { draft.addOns.push({ id: createQuoteId("extra"), label: "Novo adicional", description: "Explique o que está incluso.", price: 30, days: 1 }) })}
          renderItem={(addOn, index) => (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome do adicional</Label>
                <Input value={addOn.label} onChange={(event) => updateConfig((draft) => { draft.addOns[index].label = event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={addOn.description ?? ""} onChange={(event) => updateConfig((draft) => { draft.addOns[index].description = event.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input type="number" value={addOn.price} onChange={(event) => updateConfig((draft) => { draft.addOns[index].price = toNumber(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Dias extras</Label>
                  <Input type="number" value={addOn.days} onChange={(event) => updateConfig((draft) => { draft.addOns[index].days = toNumber(event.target.value) })} />
                </div>
              </div>
            </div>
          )}
          onRemove={(index) => updateConfig((draft) => { draft.addOns.splice(index, 1) })}
        />

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Cálculo por minutos</CardTitle>
            <CardDescription>Regra editável para cobrar minutos extras além do tempo incluso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={config.minutePricing.enabled}
                onCheckedChange={(checked) => updateConfig((draft) => { draft.minutePricing.enabled = checked === true })}
              />
              Ativar cálculo por duração
            </label>
            <div className="space-y-2">
              <Label>Pergunta que informa os minutos</Label>
              <Select
                value={config.minutePricing.questionId}
                onValueChange={(value) => updateConfig((draft) => { draft.minutePricing.questionId = value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {config.questions.map((question) => (
                    <SelectItem key={question.id} value={question.id}>{question.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Minutos inclusos</Label>
                <Input
                  type="number"
                  value={config.minutePricing.includedMinutes}
                  onChange={(event) => updateConfig((draft) => { draft.minutePricing.includedMinutes = toNumber(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor por minuto extra</Label>
                <Input
                  type="number"
                  value={config.minutePricing.pricePerExtraMinute}
                  onChange={(event) => updateConfig((draft) => { draft.minutePricing.pricePerExtraMinute = toNumber(event.target.value) })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Exemplo atual: 3 minutos gera {formatQuoteCurrency(Math.max(0, 3 - config.minutePricing.includedMinutes) * config.minutePricing.pricePerExtraMinute)} em extras.
            </p>
          </CardContent>
        </Card>

        <BuilderList
          title="Multiplicadores e presets"
          description="Regras avançadas e pacotes por nicho."
          items={config.multipliers}
          addLabel="Multiplicador"
          onAdd={() => updateConfig((draft) => { draft.multipliers.push({ id: createQuoteId("mult"), label: "Nova regra", questionId: "__category", operator: "equals", value: draft.categories[0]?.id ?? "", multiplier: 1.5 }) })}
          renderItem={(rule, index) => (
            <div className="space-y-3">
              <Input value={rule.label} onChange={(event) => updateConfig((draft) => { draft.multipliers[index].label = event.target.value })} />
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <Select value={rule.questionId} onValueChange={(value) => updateConfig((draft) => { draft.multipliers[index].questionId = value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__category">Categoria</SelectItem>
                    {config.questions.map((question) => <SelectItem key={question.id} value={question.id}>{question.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" step="0.1" value={rule.multiplier} onChange={(event) => updateConfig((draft) => { draft.multipliers[index].multiplier = Number(event.target.value) || 1 })} />
              </div>
              <Input value={rule.value} onChange={(event) => updateConfig((draft) => { draft.multipliers[index].value = event.target.value })} placeholder="Valor gatilho" />
            </div>
          )}
          onRemove={(index) => updateConfig((draft) => { draft.multipliers.splice(index, 1) })}
        />
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Biblioteca de presets
            </CardTitle>
            <CardDescription>
              Templates reutilizáveis para carregar pacotes, respostas e mensagens sem preencher tudo de novo.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => setPresetDraft({
              id: "",
              label: "Novo preset",
              description: "Pacote salvo a partir da simulação atual.",
              categoryId: previewCategoryId || config.categories[0]?.id || "",
              addOnIds: previewAddOnIds,
              answers: previewAnswers,
              manualAdjustment: 0,
              clientMessage: "",
            })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Usar simulação atual
          </Button>
        </CardHeader>
        <CardContent className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3 md:grid-cols-2">
            {libraryPresets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 p-6 text-sm text-muted-foreground md:col-span-2">
                Nenhum preset salvo ainda. Crie o primeiro para transformar um pacote complexo em um clique.
              </div>
            ) : (
              libraryPresets.map((preset) => (
                <div key={preset.id} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{preset.label}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{preset.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadPresetInSimulator(preset)} aria-label="Editar preset">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void deletePreset(preset.id)} aria-label="Remover preset">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-2 py-1">
                      {config.categories.find((category) => category.id === preset.categoryId)?.label ?? preset.categoryId}
                    </span>
                    <span className="rounded-full border border-border px-2 py-1">
                      {preset.addOnIds.length} adicionais
                    </span>
                    {preset.manualAdjustment ? (
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary">
                        Ajuste {formatQuoteCurrency(preset.manualAdjustment)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="mb-4">
              <p className="font-semibold text-foreground">Salvar/editar preset</p>
              <p className="text-sm text-muted-foreground">O preset também aparece no formulário público como template rápido.</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={presetDraft.label} onChange={(event) => setPresetDraft((current) => ({ ...current, label: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea rows={3} value={presetDraft.description ?? ""} onChange={(event) => setPresetDraft((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={presetDraft.categoryId} onValueChange={(value) => setPresetDraft((current) => ({ ...current, categoryId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {config.categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ajuste padrão</Label>
                <Input
                  type="number"
                  value={presetDraft.manualAdjustment ?? 0}
                  onChange={(event) => setPresetDraft((current) => ({ ...current, manualAdjustment: toNumber(event.target.value) }))}
                  placeholder="-50 para desconto, 100 para urgência"
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem padrão ao cliente</Label>
                <Textarea rows={3} value={presetDraft.clientMessage ?? ""} onChange={(event) => setPresetDraft((current) => ({ ...current, clientMessage: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Adicionais do pacote</Label>
                <div className="flex flex-wrap gap-2">
                  {config.addOns.map((addOn) => (
                    <label key={addOn.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
                      <Checkbox
                        checked={presetDraft.addOnIds.includes(addOn.id)}
                        onCheckedChange={(checked) => setPresetDraft((current) => ({
                          ...current,
                          addOnIds: checked === true
                            ? [...new Set([...current.addOnIds, addOn.id])]
                            : current.addOnIds.filter((id) => id !== addOn.id),
                        }))}
                      />
                      {addOn.label}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={() => void savePreset()} disabled={isPresetSaving} className="w-full gap-2">
                {isPresetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {presetDraft.id ? "Atualizar preset" : "Salvar como preset"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Presets por nicho</CardTitle>
          <CardDescription>Salve combinações rápidas como Infoprodutos, Eventos ou Social Media.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.presets.map((preset, index) => (
            <div key={preset.id} className="grid gap-3 rounded-xl border border-border bg-background/70 p-3 md:grid-cols-[1fr_1fr_auto]">
              <Input value={preset.label} onChange={(event) => updateConfig((draft) => { draft.presets[index].label = event.target.value })} />
              <Select value={preset.categoryId} onValueChange={(value) => updateConfig((draft) => { draft.presets[index].categoryId = value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {config.categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => updateConfig((draft) => { draft.presets.splice(index, 1) })} aria-label="Remover preset">
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="md:col-span-3 flex flex-wrap gap-2">
                {config.addOns.map((addOn) => (
                  <label key={addOn.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
                    <Checkbox
                      checked={preset.addOnIds.includes(addOn.id)}
                      onCheckedChange={(checked) => updateConfig((draft) => {
                        draft.presets[index].addOnIds = checked === true
                          ? [...new Set([...draft.presets[index].addOnIds, addOn.id])]
                          : draft.presets[index].addOnIds.filter((id) => id !== addOn.id)
                      })}
                    />
                    {addOn.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={() => updateConfig((draft) => { draft.presets.push({ id: createQuoteId("preset"), label: "Novo preset", categoryId: draft.categories[0]?.id ?? "", addOnIds: [] }) })}>
            <Plus className="mr-2 h-4 w-4" />
            Criar preset
          </Button>
          {message ? (
            <p className={cn("flex items-center gap-2 text-sm", message.includes("salvo") ? "text-primary" : "text-destructive")}>
              {message.includes("salvo") ? <Check className="h-4 w-4" /> : null}
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function BuilderList<T>({
  title,
  description,
  items,
  addLabel,
  onAdd,
  renderItem,
  onRemove,
}: {
  title: string
  description: string
  items: T[]
  addLabel: string
  onAdd: () => void
  renderItem: (item: T, index: number) => React.ReactNode
  onRemove: (index: number) => void
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-xl border border-border bg-background/70 p-3">
            <div className="mb-3 flex justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Item {index + 1}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onRemove(index)} aria-label="Remover item">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {renderItem(item, index)}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {addLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
