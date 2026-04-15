"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, User, Phone, Video, Calendar, Link2, MoreVertical, Pencil, Trash2, MessageCircleMore } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAppSession } from "@/components/app/app-provider"
import { deleteWorkspaceClient, fetchWorkspaceClients, subscribeWorkspaceSync, upsertWorkspaceClient } from "@/lib/workspace-db"
import { WorkspaceClient } from "@/lib/workspace-store"

const paises = [
  { codigo: "+55", pais: "Brasil", bandeira: "🇧🇷" },
  { codigo: "+1", pais: "EUA", bandeira: "🇺🇸" },
  { codigo: "+351", pais: "Portugal", bandeira: "🇵🇹" },
  { codigo: "+34", pais: "Espanha", bandeira: "🇪🇸" },
  { codigo: "+44", pais: "Reino Unido", bandeira: "🇬🇧" },
  { codigo: "+49", pais: "Alemanha", bandeira: "🇩🇪" },
  { codigo: "+33", pais: "França", bandeira: "🇫🇷" },
  { codigo: "+39", pais: "Itália", bandeira: "🇮🇹" },
  { codigo: "+54", pais: "Argentina", bandeira: "🇦🇷" },
  { codigo: "+52", pais: "México", bandeira: "🇲🇽" },
]

const frequencias = [
  { value: "diaria", label: "Diária" },
  { value: "dia-sim-dia-nao", label: "Dia sim, dia não" },
  { value: "3x-semana", label: "3x por semana" },
  { value: "2x-semana", label: "2x por semana" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "sem-frequencia", label: "Sem frequência definida" },
]

const niveisEdicao = {
  simples: {
    label: "Simples",
    descricao: "Legenda, correção de cor e cortes",
    cor: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  },
  medio: {
    label: "Médio",
    descricao: "Legenda dinâmica, correção de cor e B-rolls",
    cor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
  },
  profissional: {
    label: "Profissional",
    descricao: "Tudo + Motion Design",
    cor: "bg-primary/20 text-primary border-primary/30"
  }
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<WorkspaceClient[]>([])
  const { currentUser } = useAppSession()
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackError, setFeedbackError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<WorkspaceClient | null>(null)
  
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    codigoPais: "+55",
    nivelEdicao: "" as "simples" | "medio" | "profissional" | "",
    duracaoMedia: 15,
    frequencia: "",
    linkDrive: ""
  })

  useEffect(() => {
    if (!currentUser) return

    const syncClients = async () => {
      try {
        setFeedbackError("")
        setClientes(await fetchWorkspaceClients(currentUser.id))
      } catch (error) {
        console.error(error)
        setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar os clientes.")
      }
    }

    void syncClients()
    return subscribeWorkspaceSync(() => {
      void syncClients()
    })
  }, [currentUser])

  const resetForm = () => {
    setFormData({
      nome: "",
      telefone: "",
      codigoPais: "+55",
      nivelEdicao: "",
      duracaoMedia: 15,
      frequencia: "",
      linkDrive: ""
    })
    setEditingCliente(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    setIsSaving(true)
    setFeedbackMessage("")
    setFeedbackError("")

    try {
      const savedClient = await upsertWorkspaceClient(currentUser.id, {
        id: editingCliente?.id ?? "",
        nome: formData.nome,
        telefone: formData.telefone,
        codigoPais: formData.codigoPais,
        nivelEdicao: formData.nivelEdicao as "simples" | "medio" | "profissional",
        duracaoMedia: formData.duracaoMedia,
        frequencia: formData.frequencia,
        linkDrive: formData.linkDrive,
        createdAt: editingCliente?.createdAt ?? new Date().toISOString(),
      })

      setClientes((prev) => {
        const exists = prev.some((cliente) => cliente.id === savedClient.id)
        return exists
          ? prev.map((cliente) => (cliente.id === savedClient.id ? savedClient : cliente))
          : [savedClient, ...prev]
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
    setEditingCliente(cliente)
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone,
      codigoPais: cliente.codigoPais,
      nivelEdicao: cliente.nivelEdicao,
      duracaoMedia: cliente.duracaoMedia,
      frequencia: cliente.frequencia,
      linkDrive: cliente.linkDrive
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!currentUser) return
    try {
      setFeedbackMessage("")
      setFeedbackError("")
      await deleteWorkspaceClient(currentUser.id, id)
      setClientes((prev) => prev.filter((cliente) => cliente.id !== id))
      setFeedbackMessage("Cliente removido com sucesso.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível remover o cliente.")
    }
  }

  const paisSelecionado = paises.find(p => p.codigo === formData.codigoPais)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus clientes e projetos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingCliente ? "Editar Cliente" : "Adicionar Novo Cliente"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Preencha as informações do cliente para gerenciar seus projetos
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-foreground">Nome</Label>
                <Input
                  id="nome"
                  placeholder="Nome do cliente"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="bg-background border-border"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-foreground">Telefone</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.codigoPais}
                    onValueChange={(value) => setFormData({ ...formData, codigoPais: value })}
                  >
                    <SelectTrigger className="w-32 bg-background border-border">
                      <SelectValue>
                        {paisSelecionado && (
                          <span className="flex items-center gap-2">
                            <span>{paisSelecionado.bandeira}</span>
                            <span>{paisSelecionado.codigo}</span>
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
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
                  <Input
                    id="telefone"
                    placeholder="11999887766"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, "") })}
                    className="flex-1 bg-background border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Nível de Edição</Label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.entries(niveisEdicao) as [keyof typeof niveisEdicao, typeof niveisEdicao.simples][]).map(([key, nivel]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, nivelEdicao: key })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        formData.nivelEdicao === key
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium text-foreground">{nivel.label}</div>
                      <div className="text-sm text-muted-foreground">{nivel.descricao}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracao" className="text-foreground">
                  Duração Média dos Vídeos: {formData.duracaoMedia} minutos
                </Label>
                <input
                  type="range"
                  id="duracao"
                  min="1"
                  max="120"
                  value={formData.duracaoMedia}
                  onChange={(e) => setFormData({ ...formData, duracaoMedia: parseInt(e.target.value) })}
                  className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 min</span>
                  <span>2 horas</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequencia" className="text-foreground">Frequência de Postagens</Label>
                <Select
                  value={formData.frequencia}
                  onValueChange={(value) => setFormData({ ...formData, frequencia: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {frequencias.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drive" className="text-foreground">Link do Drive</Label>
                <Input
                  id="drive"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.linkDrive}
                  onChange={(e) => setFormData({ ...formData, linkDrive: e.target.value })}
                  className="bg-background border-border"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Pasta onde o cliente envia os vídeos brutos
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={() => {
                    setDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={
                    isSaving ||
                    !formData.nome ||
                    !formData.telefone ||
                    !formData.nivelEdicao ||
                    !formData.frequencia ||
                    !formData.linkDrive
                  }
                >
                  {isSaving ? "Salvando..." : editingCliente ? "Salvar Alterações" : "Adicionar Cliente"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {feedbackMessage && <p className="text-sm text-primary">{feedbackMessage}</p>}
      {feedbackError && <p className="text-sm text-destructive">{feedbackError}</p>}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Comunidade Exclusiva</CardTitle>
          <CardDescription className="text-muted-foreground">
            Entre nos grupos para networking, feedbacks e oportunidades.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="https://discord.gg/P4x7DKEGnJ" target="_blank">
            <Button variant="outline" className="border-border">
              <MessageCircleMore className="mr-2 h-4 w-4" />
              Comunidade Discord
            </Button>
          </Link>
          <Link href="https://chat.whatsapp.com/GCyIOZBGhYKAJ6sLvpYEUf?mode=gi_t" target="_blank">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Grupo WhatsApp
            </Button>
          </Link>
        </CardContent>
      </Card>

      {clientes.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece adicionando seu primeiro cliente para gerenciar seus projetos
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientes.map((cliente) => (
            <Card key={cliente.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {cliente.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-foreground text-base">{cliente.nome}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {paises.find(p => p.codigo === cliente.codigoPais)?.bandeira} {cliente.codigoPais} {cliente.telefone}
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
                    <DropdownMenuItem 
                      onClick={() => handleDelete(cliente.id)} 
                      className="cursor-pointer text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge className={`${niveisEdicao[cliente.nivelEdicao].cor} border`}>
                  {niveisEdicao[cliente.nivelEdicao].label}
                </Badge>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Video className="w-4 h-4" />
                    <span>Duração média: {cliente.duracaoMedia} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{frequencias.find(f => f.value === cliente.frequencia)?.label}</span>
                  </div>
                  <a 
                    href={cliente.linkDrive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>Abrir Drive</span>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
