"use client"

import { useMemo, useState } from "react"
import { Calculator, Check, Copy, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

const currencyOptions = [
  {
    id: "BRL",
    label: "Real brasileiro",
    locale: "pt-BR",
    marketMultiplier: 2.35,
    note: "Usa uma faixa pensada para o mercado brasileiro, não conversão direta do dólar.",
  },
  {
    id: "USD",
    label: "Dólar americano",
    locale: "en-US",
    marketMultiplier: 1,
    note: "Usa a faixa-base de referência internacional.",
  },
  {
    id: "EUR",
    label: "Euro",
    locale: "de-DE",
    marketMultiplier: 0.92,
    note: "Usa uma faixa ajustada para negociações em euro.",
  },
] as const

const videoTypes = [
  { id: "reels", name: "Reels / TikTok", baseReference: 50, multiplier: 1 },
  { id: "youtube-short", name: "YouTube Shorts", baseReference: 60, multiplier: 1.08 },
  { id: "youtube", name: "YouTube até 10 min", baseReference: 150, multiplier: 1.45 },
  { id: "youtube-long", name: "YouTube de 10 a 30 min", baseReference: 300, multiplier: 1.95 },
  { id: "institucional", name: "Vídeo institucional / marca", baseReference: 500, multiplier: 2.4 },
  { id: "podcast", name: "Corte de podcast", baseReference: 80, multiplier: 1.18 },
] as const

const complexityLevels = [
  { id: "simple", name: "Simples", description: "Cortes básicos, sem efeitos", multiplier: 1 },
  { id: "medium", name: "Médio", description: "Transições, legendas e trilha", multiplier: 1.45 },
  { id: "complex", name: "Complexo", description: "Motion e efeitos mais avançados", multiplier: 2.05 },
  { id: "premium", name: "Premium", description: "Animação customizada e VFX", multiplier: 2.8 },
] as const

const urgencyLevels = [
  { id: "normal", name: "Normal (7+ dias)", multiplier: 1 },
  { id: "fast", name: "Rápido (3 a 7 dias)", multiplier: 1.25 },
  { id: "urgent", name: "Urgente (1 a 2 dias)", multiplier: 1.7 },
  { id: "same-day", name: "Mesmo dia", multiplier: 2.35 },
] as const

export default function CalculadoraPage() {
  const [currency, setCurrency] = useState<(typeof currencyOptions)[number]["id"]>("BRL")
  const [videoType, setVideoType] = useState("")
  const [complexity, setComplexity] = useState("")
  const [urgency, setUrgency] = useState("")
  const [duration, setDuration] = useState([5])
  const [revisions, setRevisions] = useState([2])
  const [copied, setCopied] = useState(false)

  const selectedCurrency = currencyOptions.find((option) => option.id === currency) ?? currencyOptions[0]

  const formatPrice = (value: number) =>
    new Intl.NumberFormat(selectedCurrency.locale, {
      style: "currency",
      currency: selectedCurrency.id,
      maximumFractionDigits: 0,
    }).format(Math.round(value))

  const calculatedPrice = useMemo(() => {
    if (!videoType || !complexity || !urgency) return null

    const video = videoTypes.find((item) => item.id === videoType)
    const complexityLevel = complexityLevels.find((item) => item.id === complexity)
    const urgencyLevel = urgencyLevels.find((item) => item.id === urgency)

    if (!video || !complexityLevel || !urgencyLevel) return null

    const referenceBase = video.baseReference * video.multiplier
    const complexityPrice = referenceBase * complexityLevel.multiplier
    const urgencyPrice = complexityPrice * urgencyLevel.multiplier
    const durationFactor = 1 + (duration[0] - 1) * 0.08
    const revisionsFactor = 1 + (revisions[0] - 1) * 0.09
    const localMarketPrice = urgencyPrice * durationFactor * revisionsFactor * selectedCurrency.marketMultiplier

    return {
      min: Math.round(localMarketPrice * 0.9),
      recommended: Math.round(localMarketPrice),
      max: Math.round(localMarketPrice * 1.18),
    }
  }, [videoType, complexity, urgency, duration, revisions, selectedCurrency.marketMultiplier])

  const handleCopy = () => {
    if (!calculatedPrice) return

    navigator.clipboard.writeText(formatPrice(calculatedPrice.recommended))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Calculadora de valores</h1>
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
                <li>• A moeda altera a faixa com lógica de mercado, não só com conversão.</li>
                <li>• Projetos urgentes precisam ter cobrança extra.</li>
                <li>• Clientes recorrentes podem receber desconto se o volume compensar.</li>
                <li>• Sempre considere seus custos de software, equipamento e tempo de revisão.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
