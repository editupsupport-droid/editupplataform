"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Calendar, Check, Copy, ExternalLink, Link2, Plus, User } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"
import { CONTACT_METHOD_LABELS } from "@/lib/app-data"
import { authFetch } from "@/lib/supabase"
import { parseReviewFeedback, serializeReviewFeedback } from "@/lib/review-utils"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { PageLoadingState } from "@/components/dashboard/page-loading-state"
import {
  createWorkspaceTask,
  fetchWorkspaceClients,
  fetchWorkspaceTasks,
  getCachedWorkspaceClients,
  getCachedWorkspaceTasks,
  subscribeWorkspaceSync,
  updateWorkspaceTask,
} from "@/lib/workspace-db"
import { WorkspaceTask } from "@/lib/workspace-store"

const columns = [
  { id: "agenda", title: "Agendado", badge: "bg-blue-500" },
  { id: "em-producao", title: "Em produção", badge: "bg-yellow-500" },
  { id: "waiting-response", title: "Aguardando resposta", badge: "bg-indigo-500" },
  { id: "refazendo", title: "Refações", badge: "bg-red-500" },
  { id: "concluido", title: "Concluído", badge: "bg-primary" },
] as const

const initialTask = {
  titulo: "",
  descricao: "",
  clienteId: "",
  prazo: "",
}

const dedupeTasks = (items: WorkspaceTask[]) => {
  const seen = new Set<string>()

  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) {
      return false
    }

    seen.add(item.id)
    return true
  })
}

export default function AgendaPage() {
  const { currentUser } = useAppSession()
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string }>>([])
  const [tarefas, setTarefas] = useState<WorkspaceTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackError, setFeedbackError] = useState("")
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [conclusaoOpen, setConclusaoOpen] = useState(false)
  const [tarefaSelecionada, setTarefaSelecionada] = useState<WorkspaceTask | null>(null)
  const [novaTarefa, setNovaTarefa] = useState(initialTask)
  const [linkDriveConclusao, setLinkDriveConclusao] = useState("")
  const [videoPrice, setVideoPrice] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const cachedClients = getCachedWorkspaceClients(currentUser.id)
    const cachedTasks = getCachedWorkspaceTasks(currentUser.id)

    if (cachedClients) {
      setClientes(cachedClients.map((cliente) => ({ id: cliente.id, nome: cliente.nome })))
    }

    if (cachedTasks) {
      setTarefas(dedupeTasks(cachedTasks))
      setIsLoading(false)
    }

    const syncData = async (showLoader = false) => {
      try {
        if (showLoader) {
          setIsLoading(true)
        }
        setFeedbackError("")
        const [workspaceClients, workspaceTasks] = await Promise.all([
          fetchWorkspaceClients(currentUser.id, { force: true }),
          fetchWorkspaceTasks(currentUser.id, { force: true }),
        ])
        setClientes(workspaceClients.map((cliente) => ({ id: cliente.id, nome: cliente.nome })))
        setTarefas(dedupeTasks(workspaceTasks))
      } catch (error) {
        console.error(error)
        setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar a agenda.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!cachedClients || !cachedTasks) {
      void syncData(true)
    }

    return subscribeWorkspaceSync(() => {
      const nextCachedClients = getCachedWorkspaceClients(currentUser.id)
      const nextCachedTasks = getCachedWorkspaceTasks(currentUser.id)

      if (nextCachedClients) {
        setClientes(nextCachedClients.map((cliente) => ({ id: cliente.id, nome: cliente.nome })))
      }

      if (nextCachedTasks) {
        setTarefas(dedupeTasks(nextCachedTasks))
        setIsLoading(false)
      }
    })
  }, [currentUser])

  const orderedColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        tasks: dedupeTasks(tarefas).filter((task) => task.colunaId === column.id),
      })),
    [tarefas]
  )

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setFeedbackError("Faça login novamente antes de criar uma tarefa.")
      return
    }
    const cliente = clientes.find((item) => item.id === novaTarefa.clienteId)
    if (!cliente) {
      setFeedbackError("Escolha um cliente antes de criar a entrega.")
      return
    }

    setIsSubmittingTask(true)
    setFeedbackMessage("")
    setFeedbackError("")

    try {
      const createdTask = await createWorkspaceTask(currentUser.id, {
        titulo: novaTarefa.titulo,
        descricao: novaTarefa.descricao,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        prazo: new Date(novaTarefa.prazo).toISOString(),
      })

      setTarefas((prev) => dedupeTasks([createdTask, ...prev]))
      setNovaTarefa(initialTask)
      setDialogOpen(false)
      setFeedbackMessage("Tarefa criada com sucesso.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível criar a tarefa.")
    } finally {
      setIsSubmittingTask(false)
    }
  }

  const moveTask = async (taskId: string, columnId: WorkspaceTask["colunaId"]) => {
    if (!currentUser) {
      setFeedbackError("Faça login novamente antes de atualizar a tarefa.")
      return
    }
    setIsUpdatingTask(true)
    setFeedbackMessage("")
    setFeedbackError("")

    try {
      const updatedTask = await updateWorkspaceTask(currentUser.id, taskId, {
        colunaId: columnId,
      })

      if (updatedTask) {
        setTarefas((prev) => dedupeTasks(prev.map((task) => (task.id === taskId ? updatedTask : task))))
        setFeedbackMessage("Tarefa atualizada com sucesso.")
      }
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível atualizar a tarefa.")
    } finally {
      setIsUpdatingTask(false)
    }
  }

  const openApprovalLink = (task: WorkspaceTask) => {
    setTarefaSelecionada(task)
    setLinkDialogOpen(true)
  }

  const handleGenerateApproval = async () => {
    if (!currentUser) {
      setFeedbackError("Faça login novamente antes de gerar o link de aprovação.")
      return
    }

    if (!tarefaSelecionada) {
      setFeedbackError("Escolha uma tarefa antes de gerar o link de aprovação.")
      return
    }

    if (!linkDriveConclusao.trim()) {
      setFeedbackError("Adicione um link do Drive antes de gerar o link de aprovação.")
      return
    }

    setIsUpdatingTask(true)
    setFeedbackMessage("")
    setFeedbackError("")

    try {
      const parsedPrice = Number(videoPrice)
      const approvalResponse = await authFetch("/api/approval-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: tarefaSelecionada.id,
          driveLink: linkDriveConclusao.trim(),
          priceUsd: Number.isFinite(parsedPrice) ? parsedPrice : null,
        }),
      })
      const approvalPayload = (await approvalResponse.json().catch(() => ({}))) as { error?: string; approvalLink?: string }
      if (!approvalResponse.ok || !approvalPayload.approvalLink) {
        throw new Error(approvalPayload.error ?? "Não foi possível gerar o link de aprovação.")
      }

      const updatedTask = await updateWorkspaceTask(currentUser.id, tarefaSelecionada.id, {
        linkDrive: linkDriveConclusao.trim(),
        linkAprovacao: approvalPayload.approvalLink,
        colunaId: "waiting-response",
        statusCliente: "pendente",
        notificationRead: true,
        feedbackCliente: serializeReviewFeedback({
          priceUsd: Number.isFinite(parsedPrice) ? parsedPrice : null,
          revisionItems: [],
        }),
      })

      if (updatedTask) {
        setTarefas((prev) => dedupeTasks(prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))))
        setTarefaSelecionada(updatedTask)
        setFeedbackMessage("Link de aprovação gerado com sucesso.")
      }

      setLinkDriveConclusao("")
      setVideoPrice("")
      setConclusaoOpen(false)
      setLinkDialogOpen(true)
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível gerar o link de aprovação.")
    } finally {
      setIsUpdatingTask(false)
    }
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

  const selectedTaskReview = tarefaSelecionada ? parseReviewFeedback(tarefaSelecionada.feedbackCliente) : null
  const formattedSelectedPrice =
    selectedTaskReview?.priceUsd != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(selectedTaskReview.priceUsd)
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Schedule</h1>
          <p className="mt-1 text-muted-foreground">Um board simples de produção para suas entregas.</p>
        </div>
      </div>

      <div className="flex items-center justify-end">
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
                Crie uma entrega vinculada a um cliente existente.
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
                    <SelectValue placeholder="Selecione um cliente" />
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
                disabled={!clientes.length || isSubmittingTask}
              >
                {isSubmittingTask ? "Criando..." : "Criar tarefa"}
              </Button>
              {!clientes.length && (
                <p className="text-xs text-muted-foreground">Adicione um cliente primeiro para montar sua agenda.</p>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <FeedbackBanner message={feedbackMessage} type="success" />
      <FeedbackBanner message={feedbackError} type="error" />

      {isLoading ? (
        <PageLoadingState
          title="Carregando agenda"
          description="Estamos organizando as entregas por etapa para você retomar o fluxo rapidamente."
        />
      ) : (
      <div className="grid gap-4 xl:grid-cols-4">
        {orderedColumns.map((column) => (
          <Card key={column.id} className="border-border bg-card/80">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${column.badge}`} />
                  <CardTitle className="text-base text-foreground">{column.title}</CardTitle>
                </div>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                  {column.tasks.length}
                </span>
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                {column.id === "agenda"
                  ? "Tarefas prontas para começar."
                  : column.id === "em-producao"
                    ? "Vídeos em edição neste momento."
                    : column.id === "waiting-response"
                      ? "Entregues e aguardando resposta do cliente."
                      : column.id === "refazendo"
                        ? "Cliente pediu ajustes."
                        : "Trabalho aprovado e concluído."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {column.tasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  Nenhuma tarefa nesta etapa por enquanto.
                </div>
              )}

              {column.tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-border bg-background p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)] space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-6 text-foreground">{task.titulo}</p>
                      {task.statusCliente && task.statusCliente !== "pendente" && (
                        <Badge className={task.statusCliente === "concluido" ? "bg-primary/15 text-primary" : "bg-red-500/15 text-red-400"}>
                          {task.statusCliente === "concluido" ? "Aprovado" : "Refação"}
                        </Badge>
                      )}
                    </div>
                    {task.descricao && <p className="text-sm leading-6 text-muted-foreground">{task.descricao}</p>}
                  </div>

                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                      <User className="h-3 w-3" />
                      {task.clienteNome}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.prazo)}
                    </span>
                  </div>

                  {task.linkDrive && (
                    <Link
                      href={task.linkDrive}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir vídeo entregue
                    </Link>
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    {column.id !== "em-producao" && column.id !== "waiting-response" && column.id !== "refazendo" && (
                      <Button variant="outline" className="border-border bg-card" size="sm" onClick={() => moveTask(task.id, "em-producao")}>
                        {isUpdatingTask ? "Salvando..." : "Mover para produção"}
                      </Button>
                    )}
                    {column.id !== "concluido" && column.id !== "waiting-response" && (
                      <Button
                        variant="outline"
                        className="border-border bg-card"
                        size="sm"
                        onClick={() => {
                          setTarefaSelecionada(task)
                          const existingReview = parseReviewFeedback(task.feedbackCliente)
                          setLinkDriveConclusao(task.linkDrive ?? "")
                          setVideoPrice(existingReview.priceUsd != null ? String(existingReview.priceUsd) : "")
                          setConclusaoOpen(true)
                        }}
                      >
                        Gerar aprovação
                      </Button>
                    )}
                    {task.linkAprovacao && (
                      <Button variant="outline" className="border-border bg-card" size="sm" onClick={() => openApprovalLink(task)}>
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
      )}

      <Dialog open={conclusaoOpen} onOpenChange={setConclusaoOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Gerar link de aprovação</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Adicione os dados da entrega que o cliente vai revisar.
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
            <div className="space-y-2">
              <Label className="text-foreground">Valor do vídeo (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={videoPrice}
                onChange={(e) => setVideoPrice(e.target.value)}
                placeholder="450"
                className="border-border bg-background"
              />
            </div>
            {currentUser && (
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-foreground">Perfil do editor mostrado ao cliente</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p className="text-foreground">{currentUser.profile.fullName || currentUser.name}</p>
                  <p>{currentUser.profile.professionalTitle || "Editor de vídeo"}</p>
                  {currentUser.profile.bio && <p>{currentUser.profile.bio}</p>}
                  <p>
                    Contato: {CONTACT_METHOD_LABELS[currentUser.profile.contactMethod]}{" "}
                    {currentUser.profile.contactValue}
                  </p>
                </div>
              </div>
            )}
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleGenerateApproval}
              disabled={!linkDriveConclusao.trim() || !videoPrice.trim() || isUpdatingTask}
            >
              {isUpdatingTask ? "Gerando..." : "Gerar link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Link de aprovação</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Quando o cliente responder, a agenda será atualizada automaticamente para concluído ou refação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {formattedSelectedPrice && (
              <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                Valor do projeto: <span className="font-medium text-foreground">{formattedSelectedPrice}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input value={tarefaSelecionada?.linkAprovacao ?? ""} readOnly className="border-border bg-background" />
              <Button variant="outline" size="icon" className="border-border" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {tarefaSelecionada?.linkDrive && (
              <Link href={tarefaSelecionada.linkDrive} target="_blank" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink className="h-4 w-4" />
                Abrir vídeo entregue
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
