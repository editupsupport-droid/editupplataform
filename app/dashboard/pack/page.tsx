"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Clapperboard, Download, ExternalLink, Music, Package, Search, Sparkles } from "lucide-react"

const sections = {
  videos: {
    label: "Vídeos Brutos",
    icon: Clapperboard,
    items: [
      { name: "Advogados", description: "Biblioteca de vídeos brutos para nicho jurídico.", url: "https://drive.google.com/drive/folders/1X4QtT-zribezocrnCKzqHfkgOGI9AWM5?usp=share_link" },
      { name: "Cursos", description: "Materiais para páginas e criativos de cursos.", url: "https://drive.google.com/drive/folders/1qJdnGxYRkzU6gl2UY3Rh3YuOTsefMPix?usp=sharing" },
      { name: "Doutores", description: "Vídeos brutos para conteúdos médicos.", url: "https://drive.google.com/drive/folders/1tt3lKvIq15jnw6tgY3w1OVQEmYSN7v9M?usp=sharing" },
      { name: "Engenheiros", description: "Acervo para criativos e vídeos de engenharia.", url: "https://drive.google.com/drive/folders/17dEDFFB03shgqXb_EU4b1XkGuaRjymiT?usp=sharing" },
      { name: "Informática", description: "Vídeos e cenas para conteúdos tech.", url: "https://drive.google.com/drive/folders/1mpzQfv5NIar4Q6LLp6MuxIaM6txQP64D?usp=sharing" },
    ],
  },
  audio: {
    label: "Sound Effects",
    icon: Music,
    items: [
      { name: "Músicas", description: "Coleção musical para edições e anúncios.", url: "https://drive.google.com/drive/folders/1tqhTm_5sEIFBXJMSwiKP8D4Qv_TVWrCB?usp=sharing" },
      { name: "Woosh", description: "Transições e movimentos com impacto.", url: "https://drive.google.com/drive/folders/1bwMUtu_eFxV4rGTd9bqKl9DhDWXExCiG?usp=sharing" },
      { name: "UI", description: "Sons para interface e animações.", url: "https://drive.google.com/drive/folders/1_JUKd2KmeSfDMzVIB2Q3SJb3Vvfc-XKp?usp=sharing" },
      { name: "Mais usados", description: "Biblioteca principal com os SFX mais úteis.", url: "https://drive.google.com/drive/folders/1r36Kv7FxFJz6SwCE4nlr4u_GC_ocwGZu?usp=sharing" },
      { name: "Click", description: "Cliques, toques e confirmações.", url: "https://drive.google.com/drive/folders/1bNveYPzJEiDoy74p6dqK0xb2g9v5DjHZ?usp=sharing" },
    ],
  },
  presets: {
    label: "Presets",
    icon: Sparkles,
    items: [
      { name: "Texto Animado", description: "Presets prontos para títulos e legendas.", url: "https://drive.google.com/drive/folders/1kqKA0yspkew7-Tl5dTQu1Wfyzom4WmES?usp=sharing" },
      { name: "Animações CTA", description: "Inscreva-se, siga no Instagram e outros CTAs.", url: "https://drive.google.com/drive/folders/1YiDNtcmtnn_AC2Huziw37jBy7tYPBTma?usp=sharing" },
    ],
  },
  tools: {
    label: "Ferramentas",
    icon: Package,
    items: [
      { name: "Premiere Download", description: "Link informado para download do Adobe Premiere Pro.", url: "https://filecr.com/windows/adobe-premiere-pro-0064/?id=655243584000" },
    ],
  },
} as const

const allItems = Object.entries(sections).flatMap(([sectionId, section]) =>
  section.items.map((item) => ({
    ...item,
    sectionId,
    sectionLabel: section.label,
    icon: section.icon,
  }))
)

export default function PackPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeSection, setActiveSection] = useState<keyof typeof sections | "all">("all")

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesSection = activeSection === "all" || item.sectionId === activeSection
      const normalizedSearch = searchTerm.trim().toLowerCase()
      const matchesSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.description.toLowerCase().includes(normalizedSearch) ||
        item.sectionLabel.toLowerCase().includes(normalizedSearch)

      return matchesSection && matchesSearch
    })
  }, [activeSection, searchTerm])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Pack de Edição</h1>
        <p className="mt-1 text-muted-foreground">
          Links reais para vídeos brutos, sound effects, presets e ferramentas do pack.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr,auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar item do pack"
            className="border-border bg-input pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeSection === "all" ? "default" : "outline"}
            onClick={() => setActiveSection("all")}
            className={activeSection === "all" ? "bg-primary text-primary-foreground" : "border-border"}
          >
            Todos
          </Button>
          {(Object.entries(sections) as Array<[keyof typeof sections, (typeof sections)[keyof typeof sections]]>).map(([sectionId, section]) => (
            <Button
              key={sectionId}
              variant={activeSection === sectionId ? "default" : "outline"}
              onClick={() => setActiveSection(sectionId)}
              className={activeSection === sectionId ? "bg-primary text-primary-foreground" : "border-border"}
            >
              <section.icon className="mr-2 h-4 w-4" />
              {section.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <Card key={`${item.sectionId}-${item.name}`} className="border-border bg-card">
            <CardHeader>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="secondary">{item.sectionLabel}</Badge>
              </div>
              <CardTitle className="text-foreground">{item.name}</CardTitle>
              <CardDescription className="text-muted-foreground">{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link href={item.url} target="_blank" className="flex-1">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Download className="mr-2 h-4 w-4" />
                  Abrir link
                </Button>
              </Link>
              <Link href={item.url} target="_blank">
                <Button variant="outline" size="icon" className="border-border">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum item encontrado com esse filtro.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
