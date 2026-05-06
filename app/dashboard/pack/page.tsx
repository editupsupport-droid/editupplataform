"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Film, FolderDown, Loader2, Music, Scale, Sparkles, Stethoscope, Wand2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { useAppSession } from "@/components/app/app-provider"
import { authFetch } from "@/lib/supabase"
import { fetchWorkspaceClients, getCachedWorkspaceClients, subscribeWorkspaceSync } from "@/lib/workspace-db"

type ClientFolder = {
  id: string
  nome: string
  driveFolderId?: string
  driveFolderName?: string
}

type PackResource = {
  id: string
  title: string
  category: "Vídeos brutos" | "Software" | "Sound Effects" | "Presets"
  description: string
  url: string
  icon: LucideIcon
}

type PackCategory = PackResource["category"] | "Todos"

const resources: PackResource[] = [
  {
    id: "brutos-advogados",
    title: "Advogados",
    category: "Vídeos brutos",
    description: "Banco de takes brutos para criativos, anúncios e conteúdos jurídicos.",
    url: "https://drive.google.com/drive/folders/1X4QtT-zribezocrnCKzqHfkgOGI9AWM5?usp=share_link",
    icon: Scale,
  },
  {
    id: "brutos-cursos",
    title: "Cursos",
    category: "Vídeos brutos",
    description: "Takes para aulas, infoprodutos, mentorias e conteúdos educacionais.",
    url: "https://drive.google.com/drive/folders/1qJdnGxYRkzU6gl2UY3Rh3YuOTsefMPix?usp=sharing",
    icon: Film,
  },
  {
    id: "brutos-doutores",
    title: "Doutores",
    category: "Vídeos brutos",
    description: "Cenas brutas para clínicas, médicos, saúde, estética e autoridade.",
    url: "https://drive.google.com/drive/folders/1tt3lKvIq15jnw6tgY3w1OVQEmYSN7v9M?usp=sharing",
    icon: Stethoscope,
  },
  {
    id: "brutos-engenheiros",
    title: "Engenheiros",
    category: "Vídeos brutos",
    description: "Takes técnicos para engenharia, construção, obras e apresentação profissional.",
    url: "https://drive.google.com/drive/folders/17dEDFFB03shgqXb_EU4b1XkGuaRjymiT?usp=sharing",
    icon: Film,
  },
  {
    id: "brutos-informatica",
    title: "Informática",
    category: "Vídeos brutos",
    description: "Materiais brutos para tecnologia, suporte, informática e serviços digitais.",
    url: "https://drive.google.com/drive/folders/1mpzQfv5NIar4Q6LLp6MuxIaM6txQP64D?usp=sharing",
    icon: Film,
  },
  {
    id: "premiere-oficial",
    title: "Premiere Pro",
    category: "Software",
    description: "Página oficial da Adobe para baixar ou assinar o Premiere Pro com segurança.",
    url: "https://www.adobe.com/products/premiere.html",
    icon: Sparkles,
  },
  {
    id: "sfx-musicas",
    title: "Músicas",
    category: "Sound Effects",
    description: "Biblioteca musical para edição, ritmo e ambientação de vídeos.",
    url: "https://drive.google.com/drive/folders/1tqhTm_5sEIFBXJMSwiKP8D4Qv_TVWrCB?usp=sharing",
    icon: Music,
  },
  {
    id: "sfx-woosh",
    title: "Woosh",
    category: "Sound Effects",
    description: "Transições sonoras para cortes, movimentos, entradas e saídas.",
    url: "https://drive.google.com/drive/folders/1bwMUtu_eFxV4rGTd9bqKl9DhDWXExCiG?usp=sharing",
    icon: Music,
  },
  {
    id: "sfx-ui",
    title: "UI",
    category: "Sound Effects",
    description: "Sons de interface, botões, pops, notifications e microinterações.",
    url: "https://drive.google.com/drive/folders/1_JUKd2KmeSfDMzVIB2Q3SJb3Vvfc-XKp?usp=sharing",
    icon: Music,
  },
  {
    id: "sfx-mais-usados",
    title: "Mais usados",
    category: "Sound Effects",
    description: "Coleção rápida com os efeitos sonoros mais recorrentes no fluxo de edição.",
    url: "https://drive.google.com/drive/folders/1r36Kv7FxFJz6SwCE4nlr4u_GC_ocwGZu?usp=sharing",
    icon: Music,
  },
  {
    id: "sfx-click",
    title: "Click",
    category: "Sound Effects",
    description: "Clicks e taps para destacar ações, telas, menus e elementos visuais.",
    url: "https://drive.google.com/drive/folders/1bNveYPzJEiDoy74p6dqK0xb2g9v5DjHZ?usp=sharing",
    icon: Music,
  },
  {
    id: "preset-texto-animado",
    title: "Texto Animado",
    category: "Presets",
    description: "Presets de texto animado para chamadas, títulos, legendas e destaques.",
    url: "https://drive.google.com/drive/folders/1kqKA0yspkew7-Tl5dTQu1Wfyzom4WmES?usp=sharing",
    icon: Wand2,
  },
  {
    id: "preset-cta",
    title: "Animações CTA",
    category: "Presets",
    description: "Animações de inscreva-se, siga-me no Instagram e chamadas de ação.",
    url: "https://drive.google.com/drive/folders/1YiDNtcmtnn_AC2Huziw37jBy7tYPBTma?usp=sharing",
    icon: Wand2,
  },
]

const categories: PackCategory[] = ["Todos", "Vídeos brutos", "Sound Effects", "Presets", "Software"]

const buildResourceFile = (resource: PackResource) =>
  new File(
    [
      `EditUp Editing Pack\n\nRecurso: ${resource.title}\nCategoria: ${resource.category}\nLink: ${resource.url}\n\n${resource.description}\n`,
    ],
    `${resource.id}.txt`,
    { type: "text/plain" }
  )

export default function PackPage() {
  const { currentUser } = useAppSession()
  const [clientes, setClientes] = useState<ClientFolder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState("")
  const [savingResourceId, setSavingResourceId] = useState("")
  const [activeCategory, setActiveCategory] = useState<PackCategory>("Todos")
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackError, setFeedbackError] = useState("")

  const linkedClients = useMemo(() => clientes.filter((cliente) => cliente.driveFolderId), [clientes])
  const filteredResources = useMemo(() => {
    if (activeCategory === "Todos") return resources
    return resources.filter((resource) => resource.category === activeCategory)
  }, [activeCategory])

  useEffect(() => {
    if (!currentUser) return

    const applyClients = (items: Awaited<ReturnType<typeof fetchWorkspaceClients>>) => {
      setClientes(
        items.map((cliente) => ({
          id: cliente.id,
          nome: cliente.nome,
          driveFolderId: cliente.driveFolderId,
          driveFolderName: cliente.driveFolderName,
        }))
      )
    }

    const cachedClients = getCachedWorkspaceClients(currentUser.id)
    if (cachedClients) {
      applyClients(cachedClients)
    }

    void fetchWorkspaceClients(currentUser.id, { force: true })
      .then(applyClients)
      .catch((error) => {
        console.error(error)
        setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar as pastas vinculadas.")
      })

    return subscribeWorkspaceSync(() => {
      const nextClients = getCachedWorkspaceClients(currentUser.id)
      if (nextClients) {
        applyClients(nextClients)
      }
    })
  }, [currentUser])

  const handleDownload = (resource: PackResource) => {
    window.open(resource.url, "_blank", "noopener,noreferrer")
  }

  const handleSaveToDrive = async (resource: PackResource) => {
    if (!selectedFolderId) {
      setFeedbackError("Selecione uma pasta de cliente antes de salvar no Drive.")
      return
    }

    try {
      setSavingResourceId(resource.id)
      setFeedbackMessage("")
      setFeedbackError("")

      const formData = new FormData()
      formData.set("folderId", selectedFolderId)
      formData.set("file", buildResourceFile(resource))

      const response = await authFetch("/api/google-drive/upload", {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível salvar o recurso no Drive.")
      }

      setFeedbackMessage(`${resource.title} foi salvo na pasta vinculada.`)
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível salvar o recurso no Drive.")
    } finally {
      setSavingResourceId("")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Editing Pack</h1>
          <p className="mt-1 text-muted-foreground">Biblioteca nativa de vídeos brutos, sound effects, presets e recursos para acelerar a edição.</p>
        </div>
        <div className="w-full lg:w-80">
          <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
            <SelectTrigger className="border-border bg-card">
              <SelectValue placeholder="Salvar recursos em pasta do Drive" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              {linkedClients.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.driveFolderId || ""}>
                  {cliente.nome} • {cliente.driveFolderName || "Pasta padrão"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              activeCategory === category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <FeedbackBanner message={feedbackMessage} type="success" />
      <FeedbackBanner message={feedbackError} type="error" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="border-border bg-card">
            <CardHeader>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <resource.icon className="h-5 w-5" />
                </div>
                <Badge className="bg-primary/15 text-primary">{resource.category}</Badge>
              </div>
              <CardTitle className="text-base text-foreground">{resource.title}</CardTitle>
              <CardDescription className="text-muted-foreground">{resource.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full border-border" onClick={() => handleDownload(resource)}>
                <Download className="mr-2 h-4 w-4" />
                Download direto
              </Button>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!selectedFolderId || savingResourceId === resource.id}
                onClick={() => void handleSaveToDrive(resource)}
              >
                {savingResourceId === resource.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderDown className="mr-2 h-4 w-4" />}
                Salvar no Drive
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredResources.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhum recurso encontrado nessa categoria.
        </div>
      )}
    </div>
  )
}
