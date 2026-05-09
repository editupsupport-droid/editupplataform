"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, User, Phone, Link2, MoreVertical, Pencil, Trash2, ArrowRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAppSession } from "@/components/app/app-provider"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { PageEmptyState } from "@/components/dashboard/page-empty-state"
import { PageLoadingState } from "@/components/dashboard/page-loading-state"
import {
  deleteWorkspaceClient,
  fetchWorkspaceClients,
  getCachedWorkspaceClients,
  subscribeWorkspaceSync,
  upsertWorkspaceClient,
} from "@/lib/workspace-db"
import { WorkspaceClient } from "@/lib/workspace-store"
import { createDefaultClientProfile } from "@/lib/workflow-insights"
import { DrivePickerButton } from "@/components/google-drive/drive-picker-button"

const paises = [
  { codigo: "+55", pais: "Brasil", bandeira: "🇧🇷" },
  { codigo: "+1", pais: "Estados Unidos", bandeira: "🇺🇸" },
  { codigo: "+351", pais: "Portugal", bandeira: "🇵🇹" },
  { codigo: "+34", pais: "Espanha", bandeira: "🇪🇸" },
  { codigo: "+44", pais: "Reino Unido", bandeira: "🇬🇧" },
  { codigo: "+49", pais: "Alemanha", bandeira: "🇩🇪" },
  { codigo: "+33", pais: "França", bandeira: "🇫🇷" },
  { codigo: "+39", pais: "Itália", bandeira: "🇮🇹" },
  { codigo: "+54", pais: "Argentina", bandeira: "🇦🇷" },
  { codigo: "+52", pais: "México", bandeira: "🇲🇽" },
] as const

const frequencias = [
  { value: "diaria", label: "Diariamente" },
  { value: "dia-sim-dia-nao", label: "Dia sim, dia não" },
  { value: "3x-semana", label: "3x por semana" },
  { value: "2x-semana", label: "2x por semana" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "sem-frequencia", label: "Sem frequência fixa" },
] as const

const niveisEdicao = {
  simples: {
    label: "Simples",
    descricao: "Legendas, correção de cor e cortes",
    cor: "bg-secondary text-muted-foreground border-border",
  },
  medio: {
    label: "Médio",
    descricao: "Legendas dinâmicas, correção de cor e B-roll",
    cor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  profissional: {
    label: "Profissional",
    descricao: "Tudo isso mais motion design",
    cor: "bg-primary/20 text-primary border-primary/30",
  },
} as const

const defaultFormData = {
  nome: "",
  fotoUrl: "",
  telefone: "",
  codigoPais: "+55",
  nivelEdicao: "simples" as "simples" | "medio" | "profissional",
  duracaoMedia: 15,
  frequencia: "sem-frequencia",
  linkDrive: "",
  driveFolderId: "",
  driveFolderName: "",
  tipoConteudo: "",
  formatoPadrao: "9:16",
  prazoHabitual: "48h",
  nivelExigencia: "medio" as "baixo" | "medio" | "alto",
  revisoesMedias: 2,
  observacoes: "",
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<WorkspaceClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { currentUser } = useAppSession()
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackError, setFeedbackError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<WorkspaceClient | null>(null)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!currentUser) return

    const cachedClients = getCachedWorkspaceClients(currentUser.id)

    if (cachedClients) {
      setClientes(cachedClients)
      setIsLoading(false)
    }

    const syncClients = async (showLoader = false) => {
      try {
        if (showLoader) {
          setIsLoading(true)
        }
        setFeedbackError("")
        const nextClients = await fetchWorkspaceClients(currentUser.id, { force: true })
        setClientes(nextClients)
      } catch (error) {
        console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar os clientes.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!cachedClients) {
      void syncClients(true)
    } else {
      void syncClients()
    }

    return subscribeWorkspaceSync(() => {
      const nextCachedClients = getCachedWorkspaceClients(currentUser.id)
      if (nextCachedClients) setClientes(nextCachedClients)
      setIsLoading(false)
    })
  }, [currentUser])

  const resetForm = () => {
    setFormData(defaultFormData)
    setEditingCliente(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setFeedbackError("Entre novamente antes de salvar o cliente.")
      return
    }
    setIsSaving(true)
    setFeedbackMessage("")
    setFeedbackError("")

    try {
      const savedClient = await upsertWorkspaceClient(currentUser.id, {
        id: editingCliente?.id ?? "",
        nome: formData.nome.trim(),
        fotoUrl: formData.fotoUrl.trim(),
        telefone: formData.telefone.trim(),
        codigoPais: formData.codigoPais,
        nivelEdicao: formData.nivelEdicao,
        duracaoMedia: formData.duracaoMedia,
        frequencia: formData.frequencia,
        linkDrive: formData.linkDrive.trim(),
        driveFolderId: formData.driveFolderId.trim(),
        driveFolderName: formData.driveFolderName.trim(),
        createdAt: editingCliente?.createdAt ?? new Date().toISOString(),
        perfilOperacional: {
          tipoConteudo: formData.tipoConteudo.trim(),
          formatoPadrao: formData.formatoPadrao,
          prazoHabitual: formData.prazoHabitual,
          nivelExigencia: formData.nivelExigencia,
          revisoesMedias: formData.revisoesMedias,
          observacoes: formData.observacoes.trim(),
        },
      })

      setClientes((prev) => {
        const exists = prev.some((cliente) => cliente.id === savedClient.id)
        return exists ? prev.map((cliente) => (cliente.id === savedClient.id ? savedClient : cliente)) : [savedClient, ...prev]
      })

      setFeedbackMessage(editingCliente ? "Cliente atualizado com sucesso." : "Cliente salvo com sucesso.")
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível salvar o cliente.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (cliente: WorkspaceClient) => {
    const profile = cliente.perfilOperacional ?? createDefaultClientProfile()
    setEditingCliente(cliente)
    setFormData({
      nome: cliente.nome,
      fotoUrl: cliente.fotoUrl ?? "",
      telefone: cliente.telefone,
      codigoPais: cliente.codigoPais,
      nivelEdicao: cliente.nivelEdicao,
      duracaoMedia: cliente.duracaoMedia,
      frequencia: cliente.frequencia,
      linkDrive: cliente.linkDrive,
      driveFolderId: cliente.driveFolderId ?? "",
      driveFolderName: cliente.driveFolderName ?? "",
      tipoConteudo: profile.tipoConteudo,
      formatoPadrao: profile.formatoPadrao || "9:16",
      prazoHabitual: profile.prazoHabitual || "48h",
      nivelExigencia: profile.nivelExigencia,
      revisoesMedias: profile.revisoesMedias,
      observacoes: profile.observacoes,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!currentUser) {
      setFeedbackError("Entre novamente antes de excluir o cliente.")
      return
    }
    try {
      setFeedbackMessage("")
      setFeedbackError("")
      await deleteWorkspaceClient(currentUser.id, id)
      setClientes((prev) => prev.filter((cliente) => cliente.id !== id))
      setFeedbackMessage("Cliente excluído com sucesso.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível excluir o cliente.")
    }
  }

  const paisSelecionado = paises.find((pais) => pais.codigo === formData.codigoPais)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="mt-1 text-muted-foreground">
            Um CRM enxuto para organizar quem envia material, quanto esforço cada cliente exige e onde o trabalho vive.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          Cada cliente agora funciona como uma memória operacional do seu fluxo.
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editingCliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Salve o básico e o contexto de trabalho que evita ruído no dia a dia.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-foreground">Nome</Label>
                <Input id="nome" placeholder="Nome do cliente" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="foto" className="text-foreground">Foto do cliente</Label>
                <Input id="foto" type="url" placeholder="https://imagem-do-cliente.com/foto.jpg" value={formData.fotoUrl} onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-foreground">Telefone</Label>
                <div className="flex gap-2">
                  <Select value={formData.codigoPais} onValueChange={(value) => setFormData({ ...formData, codigoPais: value })}>
                    <SelectTrigger className="w-32">
                      <SelectValue>
                        {paisSelecionado && (
                          <span className="flex items-center gap-2">
                            <span>{paisSelecionado.bandeira}</span>
                            <span>{paisSelecionado.codigo}</span>
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {paises.map((pais) => (
                        <SelectItem key={pais.codigo} value={pais.codigo}>
                          <span className="flex items-center gap-2">
                            <span>{pais.bandeira}</span>
                            <span>{pais.codigo}</span>
                            <span className="text-muted-foreground text-sm">{pais.pais}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input id="telefone" placeholder="11999887766" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, "") })} className="flex-1" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Nível de edição</Label>
                <div className="grid gap-2">
                  {(Object.entries(niveisEdicao) as [keyof typeof niveisEdicao, (typeof niveisEdicao)["simples"]][])
                    .map(([key, nivel]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, nivelEdicao: key })}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.nivelEdicao === key ? "border-foreground bg-secondary" : "border-border bg-card hover:bg-secondary"
                        }`}
                      >
                        <div className="font-medium text-foreground">{nivel.label}</div>
                        <div className="text-sm text-muted-foreground">{nivel.descricao}</div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracao" className="text-foreground">Duração média dos vídeos: {formData.duracaoMedia} minutos</Label>
                <input type="range" id="duracao" min="1" max="120" value={formData.duracaoMedia} onChange={(e) => setFormData({ ...formData, duracaoMedia: parseInt(e.target.value) })} className="h-2 w-full cursor-pointer appearance-none rounded-md bg-secondary accent-foreground" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequencia" className="text-foreground">Frequência de postagem</Label>
                <Select value={formData.frequencia} onValueChange={(value) => setFormData({ ...formData, frequencia: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencias.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drive" className="text-foreground">Link do Drive</Label>
                <Input id="drive" type="url" placeholder="https://drive.google.com/..." value={formData.linkDrive} onChange={(e) => setFormData({ ...formData, linkDrive: e.target.value })} />
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-secondary/45 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Pasta padrão no Google Drive</p>
                    <p className="text-xs text-muted-foreground">Selecione uma pasta oficial para este cliente usando o Google Drive Picker.</p>
                  </div>
                  <DrivePickerButton
                    mode="folder"
                    onPick={(item) =>
                      setFormData((current) => ({
                        ...current,
                        driveFolderId: item.id,
                        driveFolderName: item.name,
                      }))
                    }
                  />
                </div>
                <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                  {formData.driveFolderId ? (
                    <span>
                      Pasta vinculada: <span className="font-medium text-foreground">{formData.driveFolderName || formData.driveFolderId}</span>
                    </span>
                  ) : (
                    "Nenhuma pasta vinculada ainda."
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-border bg-secondary/45 p-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo de conteúdo</Label>
                  <Input placeholder="Ex.: cortes de podcast" value={formData.tipoConteudo} onChange={(e) => setFormData({ ...formData, tipoConteudo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Observações recorrentes</Label>
                  <Input placeholder="Ex.: prefere contato por WhatsApp" value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" className="flex-1 border-border" onClick={() => { setDialogOpen(false); resetForm() }}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSaving || !formData.nome.trim() || !formData.telefone.trim()}>
                  {isSaving ? "Salvando..." : editingCliente ? "Salvar alterações" : "Adicionar cliente"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <FeedbackBanner message={feedbackMessage} type="success" />
      <FeedbackBanner message={feedbackError} type="error" />

      {isLoading ? (
        <PageLoadingState title="Carregando clientes" description="Estamos trazendo sua lista para você continuar o fluxo sem perder contexto." />
      ) : clientes.length === 0 ? (
        <PageEmptyState icon={<User className="h-7 w-7" />} title="Ainda não há clientes" description="Adicione o primeiro cliente e vincule cada nova entrega a ele na Produção." actionLabel="Adicionar cliente" onAction={() => setDialogOpen(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientes.map((cliente) => {
            const profile = cliente.perfilOperacional ?? createDefaultClientProfile()

            return (
              <Card key={cliente.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/20 bg-cover bg-center"
                      style={cliente.fotoUrl ? { backgroundImage: `url(${cliente.fotoUrl})` } : undefined}
                    >
                      {!cliente.fotoUrl && <span className="text-primary font-semibold">{cliente.nome.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div>
                      <CardTitle className="text-foreground text-base">{cliente.nome}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {paises.find((pais) => pais.codigo === cliente.codigoPais)?.bandeira} {cliente.codigoPais} {cliente.telefone}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem onClick={() => handleEdit(cliente)} className="cursor-pointer">
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(cliente.id)} className="cursor-pointer text-red-400 focus:text-red-400">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    {cliente.linkDrive ? (
                      <a href={cliente.linkDrive} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                        <Link2 className="w-4 h-4" />
                        <span>Abrir Drive</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Link2 className="w-4 h-4" />
                        <span>Ainda sem link do Drive</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Link2 className="w-4 h-4" />
                      <span>{cliente.driveFolderName ? `Pasta padrão: ${cliente.driveFolderName}` : "Sem pasta padrão vinculada"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 p-3 text-sm space-y-1">
                    <p className="font-medium text-foreground">{profile.tipoConteudo || "Sem tipo de conteúdo definido"}</p>
                    {profile.observacoes ? <p className="text-muted-foreground">{profile.observacoes}</p> : null}
                  </div>
                  <Link href={`/dashboard/clientes/${cliente.id}`} className="block">
                    <Button variant="outline" className="w-full justify-between border-border">
                      Ver CRM 360
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
