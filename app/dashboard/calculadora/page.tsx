"use client"

import { useMemo, useState } from "react"
import { Calculator, Check, Copy, FileText, Info, Link2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useAppPreferences } from "@/components/app/preferences-provider"
import { copyTextToClipboard } from "@/lib/clipboard"

const currencyOptions = [
  {
    id: "BRL",
    label: "Real brasileiro",
    locale: "pt-BR",
    hourlyRate: 55,
    note: "Faixa local pensada para o mercado brasileiro freelance, usando base por hora em vez de conversão direta.",
  },
  {
    id: "USD",
    label: "Dólar americano",
    locale: "en-US",
    hourlyRate: 35,
    note: "Baseada em referências internacionais por hora para editores freelancers.",
  },
  {
    id: "EUR",
    label: "Euro",
    locale: "de-DE",
    hourlyRate: 32,
    note: "Faixa ajustada para negociações em euro, também com base por hora.",
  },
] as const

const videoTypes = [
  { id: "reels", name: "Reels / TikTok", baseHours: 1.5, durationWeight: 0.03 },
  { id: "youtube-short", name: "YouTube Shorts", baseHours: 2, durationWeight: 0.035 },
  { id: "youtube", name: "YouTube até 10 min", baseHours: 5, durationWeight: 0.04 },
  { id: "youtube-long", name: "YouTube de 10 a 30 min", baseHours: 8, durationWeight: 0.045 },
  { id: "institucional", name: "Vídeo institucional / marca", baseHours: 9, durationWeight: 0.045 },
  { id: "podcast", name: "Corte de podcast", baseHours: 3, durationWeight: 0.035 },
] as const

const complexityLevels = [
  { id: "simple", name: "Simples", description: "Cortes básicos, sem efeitos", multiplier: 1 },
  { id: "medium", name: "Médio", description: "Transições, legendas e trilha", multiplier: 1.25 },
  { id: "complex", name: "Complexo", description: "Motion e efeitos mais avançados", multiplier: 1.6 },
  { id: "premium", name: "Premium", description: "Animação customizada e VFX", multiplier: 2.2 },
] as const

const urgencyLevels = [
  { id: "normal", name: "Normal (7+ dias)", multiplier: 1 },
  { id: "fast", name: "Rápido (3 a 7 dias)", multiplier: 1.15 },
  { id: "urgent", name: "Urgente (1 a 2 dias)", multiplier: 1.35 },
  { id: "same-day", name: "Mesmo dia", multiplier: 1.7 },
] as const

export default function CalculadoraPage() {
  const { currency, setCurrency, formatCurrency } = useAppPreferences()
  const [videoType, setVideoType] = useState("")
  const [complexity, setComplexity] = useState("")
  const [urgency, setUrgency] = useState("")
  const [duration, setDuration] = useState([5])
  const [revisions, setRevisions] = useState([2])
  const [copied, setCopied] = useState(false)
  const [proposalLink, setProposalLink] = useState("")

  const selectedCurrency = currencyOptions.find((option) => option.id === currency) ?? currencyOptions[0]

  const formatPrice = (value: number) => formatCurrency(Math.round(value), selectedCurrency.id)

  const calculatedPrice = useMemo(() => {
    if (!videoType || !complexity || !urgency) return null

    const video = videoTypes.find((item) => item.id === videoType)
    const complexityLevel = complexityLevels.find((item) => item.id === complexity)
    const urgencyLevel = urgencyLevels.find((item) => item.id === urgency)

    if (!video || !complexityLevel || !urgencyLevel) return null

    const estimatedHours = video.baseHours * (1 + (duration[0] - 1) * video.durationWeight)
    const revisionsFactor = 1 + (revisions[0] - 1) * 0.06
    const baseProjectPrice = estimatedHours * selectedCurrency.hourlyRate
    const adjustedProjectPrice =
      baseProjectPrice * complexityLevel.multiplier * urgencyLevel.multiplier * revisionsFactor

    return {
      min: Math.round(adjustedProjectPrice * 0.88),
      recommended: Math.round(adjustedProjectPrice),
      max: Math.round(adjustedProjectPrice * 1.18),
    }
  }, [videoType, complexity, urgency, duration, revisions, selectedCurrency.hourlyRate])

  const handleCopy = async () => {
    if (!calculatedPrice) return

    const didCopy = await copyTextToClipboard(formatPrice(calculatedPrice.recommended))
    if (didCopy) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const selectedVideo = videoTypes.find((item) => item.id === videoType)
  const selectedComplexity = complexityLevels.find((item) => item.id === complexity)
  const selectedUrgency = urgencyLevels.find((item) => item.id === urgency)

  const generateProposalLink = async () => {
    if (!calculatedPrice || !selectedVideo || !selectedComplexity || !selectedUrgency) return

    const proposalHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta EditUp</title>
  <style>
    body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f7f8fb; color: #111827; }
    main { max-width: 760px; margin: 40px auto; background: white; border: 1px solid #e5e7eb; border-radius: 18px; padding: 32px; }
    img { width: 52px; height: 52px; border-radius: 14px; object-fit: cover; }
    h1 { margin: 20px 0 8px; font-size: 30px; }
    .price { margin: 24px 0; font-size: 42px; font-weight: 800; color: #2563eb; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 24px; }
    .item { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0; }
    .value { margin-top: 6px; font-weight: 700; }
    @media print { body { background: white; } main { margin: 0; border: 0; } }
  </style>
</head>
<body>
  <main>
    <img src="${window.location.origin}/logo.jpeg" alt="EditUp" />
    <h1>Proposta de edição de vídeo</h1>
    <p>Escopo sugerido a partir da calculadora profissional da EditUp.</p>
    <div class="price">${formatPrice(calculatedPrice.recommended)}</div>
    <div class="grid">
      <div class="item"><div class="label">Tipo</div><div class="value">${selectedVideo.name}</div></div>
      <div class="item"><div class="label">Complexidade</div><div class="value">${selectedComplexity.name}</div></div>
      <div class="item"><div class="label">Prazo</div><div class="value">${selectedUrgency.name}</div></div>
      <div class="item"><div class="label">Duração</div><div class="value">${duration[0]} min</div></div>
      <div class="item"><div class="label">Revisões</div><div class="value">${revisions[0]} rodada(s)</div></div>
      <div class="item"><div class="label">Faixa</div><div class="value">${formatPrice(calculatedPrice.min)} a ${formatPrice(calculatedPrice.max)}</div></div>
    </div>
    <p style="margin-top: 28px; color: #6b7280; font-size: 13px;">Valores podem ser ajustados após briefing, arquivos brutos e referências finais.</p>
  </main>
</body>
</html>`
    const link = `data:text/html;charset=utf-8,${encodeURIComponent(proposalHtml)}`
    setProposalLink(link)
    await copyTextToClipboard(link)
    window.open(link, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Calculadora de propostas</h1>
        <p className="mt-1 text-muted-foreground">
          Estime um valor mais coerente para seus projetos de edição com base no tipo de entrega, prazo e complexidade.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calculator className="h-5 w-5 text-primary" />
              Dados do projeto
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Preencha os campos para gerar uma faixa de valor mais realista.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-foreground">Moeda</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as (typeof currencyOptions)[number]["id"])}>
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Selecione uma moeda" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.id} • {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">{selectedCurrency.note}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Tipo de vídeo</Label>
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Selecione o tipo de vídeo" />
                </SelectTrigger>
                <SelectContent>
                  {videoTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Complexidade</Label>
              <Select value={complexity} onValueChange={setComplexity}>
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Selecione a complexidade" />
                </SelectTrigger>
                <SelectContent>
                  {complexityLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      <div>
                        <span className="font-medium">{level.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{level.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Prazo de entrega</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Selecione o prazo" />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Duração final do vídeo</Label>
                <span className="text-sm text-muted-foreground">{duration[0]} min</span>
              </div>
              <Slider value={duration} onValueChange={setDuration} min={1} max={30} step={1} className="w-full" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Rodadas de ajuste</Label>
                <span className="text-sm text-muted-foreground">{revisions[0]} revisão(ões)</span>
              </div>
              <Slider value={revisions} onValueChange={setRevisions} min={1} max={5} step={1} className="w-full" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className={`border-border bg-card ${calculatedPrice ? "border-primary/40" : ""}`}>
            <CardHeader>
              <CardTitle className="text-foreground">Resultado</CardTitle>
              <CardDescription className="text-muted-foreground">
                Uma faixa sugerida de valor para este projeto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calculatedPrice ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Valor recomendado</p>
                    <p className="text-5xl font-bold text-primary">{formatPrice(calculatedPrice.recommended)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-secondary p-4 text-center">
                      <p className="text-xs text-muted-foreground">Faixa mínima</p>
                      <p className="text-lg font-semibold text-foreground">{formatPrice(calculatedPrice.min)}</p>
                    </div>
                    <div className="rounded-xl bg-secondary p-4 text-center">
                      <p className="text-xs text-muted-foreground">Faixa máxima</p>
                      <p className="text-lg font-semibold text-foreground">{formatPrice(calculatedPrice.max)}</p>
                    </div>
                  </div>

                  <Button onClick={handleCopy} className="w-full gap-2">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Valor copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar valor
                      </>
                    )}
                  </Button>
                  <Button onClick={() => void generateProposalLink()} variant="outline" className="w-full gap-2 border-border">
                    <FileText className="h-4 w-4" />
                    Gerar proposta imprimível
                  </Button>
                  {proposalLink && (
                    <a href={proposalLink} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="secondary" className="w-full gap-2">
                        <Link2 className="h-4 w-4" />
                        Abrir link da proposta
                      </Button>
                    </a>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Calculator className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    Preencha os campos para calcular um valor.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Info className="h-5 w-5 text-primary" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• A base agora usa horas estimadas de edição por tipo de projeto, não multiplicadores inflados.</li>
                <li>• A faixa considera referências de mercado freelance por hora e tempo médio por formato.</li>
                <li>• Projetos urgentes ainda precisam de cobrança extra, mas em nível mais realista.</li>
                <li>• Sempre considere seus custos de software, equipamento, briefing e revisão.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
