"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Check, Copy, ExternalLink, Link2, MessageCircleMore, Plus, User } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"
import {
  createWorkspaceTask,
  fetchWorkspaceClients,
  fetchWorkspaceTasks,
  subscribeWorkspaceSync,
  updateWorkspaceTask,
} from "@/lib/workspace-db"
import { WorkspaceTask } from "@/lib/workspace-store"

const columns = [
  { id: "agenda", title: "Agenda", badge: "bg-blue-500" },
  { id: "em-producao", title: "Em produção", badge: "bg-yellow-500" },
  { id: "refazendo", title: "Refazendo", badge: "bg-red-500" },
  { id: "concluido", title: "Concluído", badge: "bg-primary" },
] as const

const initialTask = {
  titulo: "",
  descricao: "",
  clienteId: "",
  prazo: "",
}

export default function AgendaPage() {
  const { currentUser } = useAppSession()
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string }>>([])
  const [tarefas, setTarefas] = useState<WorkspaceTask[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [conclusaoOpen, setConclusaoOpen] = useState(false)
  const [tarefaSelecionada, setTarefaSelecionada] = useState<WorkspaceTask | null>(null)
  const [novaTarefa, setNovaTarefa] = useState(initialTask)
  const [linkDriveConclusao, setLinkDriveConclusao] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!currentUser) return

    const syncData = async () => {
      try {
        const [workspaceClients, workspaceTasks] = await Promise.all([
          fetchWorkspaceClients(currentUser.id),
          fetchWorkspaceTasks(currentUser.id),
        ])
        setClientes(workspaceClients.map((cliente) => ({ id: cliente.id, nome: cliente.nome })))
        setTarefas(workspaceTasks)
      } catch (error) {
        console.error(error)
      }
    }

    void syncData()
    return subscribeWorkspaceSync(() => {
      void syncData()
    })
  }, [currentUser])

  const orderedColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        tasks: tarefas.filter((task) => task.colunaId === column.id),
      })),
    [tarefas]
  )

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    const cliente = clientes.find((item) => item.id === novaTarefa.clienteId)
    if (!cliente) return

    const createdTask = await createWorkspaceTask(currentUser.id, {
      titulo: novaTarefa.titulo,
      descricao: novaTarefa.descricao,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      prazo: new Date(novaTarefa.prazo).toISOString(),
    })

    setTarefas((prev) => [createdTask, ...prev])
    setNovaTarefa(initialTask)
    setDialogOpen(false)
  }

  const moveTask = async (taskId: string, columnId: WorkspaceTask["colunaId"]) => {
    if (!currentUser) return
    const updatedTask = await updateWorkspaceTask(currentUser.id, taskId, {
      colunaId: columnId,
    })

    if (updatedTask) {
      setTarefas((prev) => prev.map((task) => (task.id === taskId ? updatedTask : task)))
    }
  }

  const openApprovalLink = (task: WorkspaceTask) => {
    setTarefaSelecionada(task)
    setLinkDialogOpen(true)
  }

  const handleGenerateApproval = async () => {
    if (!currentUser || !tarefaSelecionada || !linkDriveConclusao.trim()) return

    const approvalUrl = `${window.location.origin}/aprovacao/${tarefaSelecionada.id}`
    const updatedTask = await updateWorkspaceTask(currentUser.id, tarefaSelecionada.id, {
      linkDrive: linkDriveConclusao.trim(),
      linkAprovacao: approvalUrl,
      statusCliente: "pendente",
      notificationRead: true,
    })

    if (updatedTask) {
      setTarefas((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
      setTarefaSelecionada(updatedTask)
    }

    setLinkDriveConclusao("")
    setConclusaoOpen(false)
    setLinkDialogOpen(true)
  }

  const handleCopy = async () => {
    if (!tarefaSelecionada?.linkAprovacao) return
    await navigator.clipboard.writeText(tarefaSelecionada.linkAprovacao)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="mt-1 text-muted-foreground">Organize entregas, aprovações e refações dos seus projetos.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nova tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nova tarefa</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Crie uma entrega vinculada a um cliente já cadastrado.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Título</Label>
                <Input
                  value={novaTarefa.titulo}
                  onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })}
                  className="border-border bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Descrição</Label>
                <Textarea
                  value={novaTarefa.descricao}
                  onChange={(e) => setNovaTarefa({ ...novaTarefa, descricao: e.target.value })}
                  className="border-border bg-background min-h-24"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Cliente</Label>
                <Select value={novaTarefa.clienteId} onValueChange={(value) => setNovaTarefa({ ...novaTarefa, clienteId: value })}>
                  <SelectTrigger className="border-border bg-background">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Prazo</Label>
                <Input
                  type="datetime-local"
                  value={novaTarefa.prazo}
                  onChange={(e) => setNovaTarefa({ ...novaTarefa, prazo: e.target.value })}
                  className="border-border bg-background"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!clientes.length}
              >
                Criar tarefa
              </Button>
              {!clientes.length && (
                <p className="text-xs text-muted-foreground">Cadastre um cliente antes para montar sua agenda.</p>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Comunidade Exclusiva</CardTitle>
          <CardDescription className="text-muted-foreground">
            Entre nos grupos exclusivos para suporte, networking e oportunidades.
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

      <div className="grid gap-4 xl:grid-cols-4">
        {orderedColumns.map((column) => (
          <Card key={column.id} className="border-border bg-card/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${column.badge}`} />
                  <CardTitle className="text-base text-foreground">{column.title}</CardTitle>
                </div>
                <Badge variant="secondary">{column.tasks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {column.tasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Nenhuma tarefa nesta etapa.
                </div>
              )}

              {column.tasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div>
                    <p className="font-medium text-foreground">{task.titulo}</p>
                    {task.descricao && <p className="mt-1 text-sm text-muted-foreground">{task.descricao}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {task.clienteNome}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.prazo)}
                    </span>
                  </div>

                  {task.statusCliente && task.statusCliente !== "pendente" && (
                    <Badge className={task.statusCliente === "concluido" ? "bg-primary/15 text-primary" : "bg-red-500/15 text-red-400"}>
                      {task.statusCliente === "concluido" ? "Cliente aprovou" : "Cliente pediu refação"}
                    </Badge>
                  )}

                  {task.linkDrive && (
                    <Link
                      href={task.linkDrive}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir vídeo enviado
                    </Link>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {column.id !== "em-producao" && column.id !== "refazendo" && (
                      <Button variant="outline" className="border-border" size="sm" onClick={() => moveTask(task.id, "em-producao")}>
                        Em produção
                      </Button>
                    )}
                    {column.id !== "concluido" && (
                      <Button
                        variant="outline"
                        className="border-border"
                        size="sm"
                        onClick={() => {
                          setTarefaSelecionada(task)
                          setConclusaoOpen(true)
                        }}
                      >
                        Gerar aprovação
                      </Button>
                    )}
                    {task.linkAprovacao && (
                      <Button variant="outline" className="border-border" size="sm" onClick={() => openApprovalLink(task)}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Ver link
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={conclusaoOpen} onOpenChange={setConclusaoOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Gerar link de aprovação</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Adicione o link do vídeo para enviar ao cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Link do vídeo</Label>
              <Input
                value={linkDriveConclusao}
                onChange={(e) => setLinkDriveConclusao(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="border-border bg-background"
              />
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleGenerateApproval}
              disabled={!linkDriveConclusao.trim()}
            >
              Gerar link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Link de aprovação</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Quando o cliente responder, a agenda atualiza automaticamente para concluído ou refazendo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input value={tarefaSelecionada?.linkAprovacao ?? ""} readOnly className="border-border bg-background" />
              <Button variant="outline" size="icon" className="border-border" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {tarefaSelecionada?.linkDrive && (
              <Link href={tarefaSelecionada.linkDrive} target="_blank" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink className="h-4 w-4" />
                Abrir vídeo enviado
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
