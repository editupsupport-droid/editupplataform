"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Calculator, Copy, Check, Info } from "lucide-react"

const videoTypes = [
  { id: "reels", name: "Reels / TikTok", basePrice: 50, multiplier: 1 },
  { id: "youtube-short", name: "YouTube Shorts", basePrice: 60, multiplier: 1.1 },
  { id: "youtube", name: "Vídeo YouTube (até 10min)", basePrice: 150, multiplier: 1.5 },
  { id: "youtube-long", name: "Vídeo YouTube (10-30min)", basePrice: 300, multiplier: 2 },
  { id: "institucional", name: "Vídeo Institucional", basePrice: 500, multiplier: 2.5 },
  { id: "podcast", name: "Corte de Podcast", basePrice: 80, multiplier: 1.2 },
]

const complexityLevels = [
  { id: "simple", name: "Simples", description: "Cortes básicos, sem efeitos", multiplier: 1 },
  { id: "medium", name: "Médio", description: "Transições, legendas, música", multiplier: 1.5 },
  { id: "complex", name: "Complexo", description: "Motion graphics, efeitos avançados", multiplier: 2.2 },
  { id: "premium", name: "Premium", description: "Animações personalizadas, VFX", multiplier: 3 },
]

const urgencyLevels = [
  { id: "normal", name: "Normal (7+ dias)", multiplier: 1 },
  { id: "fast", name: "Rápido (3-7 dias)", multiplier: 1.3 },
  { id: "urgent", name: "Urgente (1-2 dias)", multiplier: 1.8 },
  { id: "same-day", name: "Mesmo dia", multiplier: 2.5 },
]

export default function CalculadoraPage() {
  const [videoType, setVideoType] = useState("")
  const [complexity, setComplexity] = useState("")
  const [urgency, setUrgency] = useState("")
  const [duration, setDuration] = useState([5])
  const [revisions, setRevisions] = useState([2])
  const [copied, setCopied] = useState(false)

  const calculatedPrice = useMemo(() => {
    if (!videoType || !complexity || !urgency) return null

    const video = videoTypes.find((v) => v.id === videoType)
    const comp = complexityLevels.find((c) => c.id === complexity)
    const urg = urgencyLevels.find((u) => u.id === urgency)

    if (!video || !comp || !urg) return null

    const basePrice = video.basePrice * video.multiplier
    const complexityPrice = basePrice * comp.multiplier
    const urgencyPrice = complexityPrice * urg.multiplier
    const durationFactor = 1 + (duration[0] - 1) * 0.1
    const revisionsFactor = 1 + (revisions[0] - 1) * 0.1

    const finalPrice = urgencyPrice * durationFactor * revisionsFactor

    return {
      min: Math.round(finalPrice * 0.9),
      recommended: Math.round(finalPrice),
      max: Math.round(finalPrice * 1.2),
    }
  }, [videoType, complexity, urgency, duration, revisions])

  const handleCopy = () => {
    if (calculatedPrice) {
      navigator.clipboard.writeText(`R$ ${calculatedPrice.recommended}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Calculadora de Preços</h1>
        <p className="mt-1 text-muted-foreground">
          Calcule o valor ideal para seus projetos de edição de vídeo
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Calculator Form */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calculator className="h-5 w-5 text-primary" />
              Parâmetros do Projeto
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Preencha os detalhes para calcular o preço
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Video Type */}
            <div className="space-y-2">
              <Label className="text-foreground">Tipo de Vídeo</Label>
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger className="border-border bg-input text-foreground">
                  <SelectValue placeholder="Selecione o tipo de vídeo" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  {videoTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id} className="text-popover-foreground">
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Complexity */}
            <div className="space-y-2">
              <Label className="text-foreground">Complexidade</Label>
              <Select value={complexity} onValueChange={setComplexity}>
                <SelectTrigger className="border-border bg-input text-foreground">
                  <SelectValue placeholder="Selecione a complexidade" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  {complexityLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id} className="text-popover-foreground">
                      <div>
                        <span className="font-medium">{level.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{level.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label className="text-foreground">Prazo de Entrega</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="border-border bg-input text-foreground">
                  <SelectValue placeholder="Selecione o prazo" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  {urgencyLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id} className="text-popover-foreground">
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Duração do Vídeo Final</Label>
                <span className="text-sm text-muted-foreground">{duration[0]} minuto(s)</span>
              </div>
              <Slider
                value={duration}
                onValueChange={setDuration}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
            </div>

            {/* Revisions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Revisões Incluídas</Label>
                <span className="text-sm text-muted-foreground">{revisions[0]} revisão(ões)</span>
              </div>
              <Slider
                value={revisions}
                onValueChange={setRevisions}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        <div className="space-y-6">
          <Card className={`border-border bg-card ${calculatedPrice ? "border-primary/50" : ""}`}>
            <CardHeader>
              <CardTitle className="text-foreground">Resultado</CardTitle>
              <CardDescription className="text-muted-foreground">
                Valor sugerido para o projeto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calculatedPrice ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Preço Recomendado</p>
                    <p className="text-5xl font-bold text-primary">
                      R$ {calculatedPrice.recommended}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-secondary p-4 text-center">
                      <p className="text-xs text-muted-foreground">Mínimo</p>
                      <p className="text-lg font-semibold text-foreground">R$ {calculatedPrice.min}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-4 text-center">
                      <p className="text-xs text-muted-foreground">Máximo</p>
                      <p className="text-lg font-semibold text-foreground">R$ {calculatedPrice.max}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleCopy}
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar Preço
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Calculator className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    Preencha os campos ao lado para calcular o preço
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Info className="h-5 w-5 text-primary" />
                Dicas de Precificação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Sempre considere o tempo de revisões no preço final</li>
                <li>• Projetos urgentes devem ter taxa adicional</li>
                <li>• Clientes recorrentes podem ter desconto de 10-15%</li>
                <li>• Não esqueça de incluir custos de software e equipamentos</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
