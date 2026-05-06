"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bell, CheckCircle2, RefreshCcw, Send, Siren, TimerReset } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAppSession } from "@/components/app/app-provider"
import { useAppPreferences } from "@/components/app/preferences-provider"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { PageEmptyState } from "@/components/dashboard/page-empty-state"
import { PageLoadingState } from "@/components/dashboard/page-loading-state"
import {
  fetchWorkspaceTasks,
  getCachedWorkspaceTasks,
  markNotificationsAsRead,
  subscribeWorkspaceSync,
} from "@/lib/workspace-db"
import { formatTimestamp, parseReviewFeedback } from "@/lib/review-utils"
import { WorkspaceTask } from "@/lib/workspace-store"
import { authFetch } from "@/lib/supabase"

type FilterKey = "today" | "revisions" | "approvals" | "rejections"

type BroadcastNotification = {
  id: string
  title: string
  message: string
  createdAt: string
  createdBy: string
}

type UserSystemNotification = {
  id: string
  title: string
  message: string
  createdAt: string
  kind: "approval-expired" | "drive" | "system"
}

const adminEmail = "morinhajose1103@gmail.com"

const isSameDay = (date: Date, compareDate: Date) =>
  date.getFullYear() === compareDate.getFullYear() &&
  date.getMonth() === compareDate.getMonth() &&
  date.getDate() === compareDate.getDate()

export default function NotificationsPage() {
  const { currentUser } = useAppSession()
  const { formatCurrency } = useAppPreferences()
  const [tarefas, setTarefas] = useState<WorkspaceTask[]>([])
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>([])
  const [systemNotifications, setSystemNotifications] = useState<UserSystemNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackError, setFeedbackError] = useState("")
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterKey>("today")
  const [broadcastTitle, setBroadcastTitle] = useState("")
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const cachedTasks = getCachedWorkspaceTasks(currentUser.id)

    if (cachedTasks) {
      setTarefas(cachedTasks)
      setIsLoading(false)
    }

    const loadBroadcasts = async () => {
      const response = await fetch("/api/site-notifications", { cache: "no-store" })
      const payload = (await response.json().catch(() => ({}))) as {
        notifications?: BroadcastNotification[]
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load platform notices.")
      }

      setBroadcasts(payload.notifications ?? [])
    }

    const loadSystemNotifications = async () => {
      const response = await authFetch("/api/system-notifications", { cache: "no-store" })
      const payload = (await response.json().catch(() => ({}))) as {
        notifications?: UserSystemNotification[]
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load system notices.")
      }

      setSystemNotifications(payload.notifications ?? [])
    }

    const syncTasks = async (showLoader = false) => {
      try {
        if (showLoader) {
          setIsLoading(true)
        }
        setFeedbackError("")
        const loadedTasks = await fetchWorkspaceTasks(currentUser.id, { force: true })
        setTarefas(loadedTasks)
        await Promise.all([loadBroadcasts(), loadSystemNotifications()])
      } catch (error) {
        console.error(error)
        setFeedbackError(error instanceof Error ? error.message : "Could not load notifications.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!cachedTasks) {
      void syncTasks(true)
    } else {
      void Promise.all([loadBroadcasts(), loadSystemNotifications()]).catch((error) => {
        console.error(error)
        setFeedbackError(error instanceof Error ? error.message : "Could not load notices.")
      })
    }

    void markNotificationsAsRead(currentUser.id)

    return subscribeWorkspaceSync(() => {
      const nextCachedTasks = getCachedWorkspaceTasks(currentUser.id)
      if (nextCachedTasks) {
        setTarefas(nextCachedTasks)
        setIsLoading(false)
      }
    })
  }, [currentUser])

  const taskNotifications = useMemo(
    () =>
      tarefas
        .filter((task) => task.statusCliente && task.statusCliente !== "pendente")
        .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()),
    [tarefas]
  )

  const expiringTasks = useMemo(() => {
    const now = Date.now()
    const nextDay = now + 24 * 60 * 60 * 1000

    return tarefas
      .filter((task) => {
        const dueTime = new Date(task.prazo).getTime()
        return dueTime >= now && dueTime <= nextDay && task.colunaId !== "concluido"
      })
      .sort((a, b) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime())
  }, [tarefas])

  const filteredTaskNotifications = useMemo(() => {
    const now = new Date()

    return taskNotifications.filter((task) => {
      const review = parseReviewFeedback(task.feedbackCliente)
      const updatedAt = new Date(task.updatedAt ?? Date.now())

      if (activeFilter === "today") {
        return isSameDay(updatedAt, now)
      }

      if (activeFilter === "approvals") {
        return task.statusCliente === "concluido"
      }

      if (activeFilter === "revisions") {
        return task.statusCliente === "desaprovado" && review.revisionItems.length > 0
      }

      return task.statusCliente === "desaprovado" && review.revisionItems.length === 0
    })
  }, [activeFilter, taskNotifications])

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setFeedbackError("Write a title and message before sending the notification.")
      return
    }

    setIsSendingBroadcast(true)
    setFeedbackError("")
    setFeedbackMessage("")

    try {
      const response = await fetch("/api/site-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        notification?: BroadcastNotification
      }

      if (!response.ok || !payload.notification) {
        throw new Error(payload.error ?? "Could not send the platform notice.")
      }

      const nextNotification = payload.notification
      setBroadcasts((current) => (nextNotification ? [nextNotification, ...current] : current))
      setBroadcastTitle("")
      setBroadcastMessage("")
      setFeedbackMessage("Notification sent to all users.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Could not send the platform notice.")
    } finally {
      setIsSendingBroadcast(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
          <p className="mt-1 text-muted-foreground">
            Revisões, aprovações, prazos próximos e avisos importantes da plataforma.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          Alertas importantes aparecem como uma caixa de entrada acionável.
        </div>
      </div>

      <FeedbackBanner message={feedbackError || feedbackMessage} type={feedbackError ? "error" : "success"} />

      {expiringTasks.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TimerReset className="h-5 w-5 text-amber-300" />
              Entregas próximas do prazo
            </CardTitle>
            <CardDescription className="text-foreground/70">
              Abra o projeto ou gere um link de aprovação antes do prazo virar urgência.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-amber-500/20 bg-background/70 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{task.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.clienteNome} • prazo {new Intl.DateTimeFormat("pt-BR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(task.prazo))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/kanban?taskId=${task.id}`}>
                      <Button size="sm" variant="outline" className="border-border">Abrir projeto</Button>
                    </Link>
                    <Link href="/dashboard/drive">
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Gerar entrega</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Siren className="h-5 w-5 text-primary" />
            Avisos da plataforma
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Comunicados gerais para todo mundo da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser?.email === adminEmail && (
            <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
              <div className="space-y-2">
                <Label className="text-foreground">Título da notificação</Label>
                <Input value={broadcastTitle} onChange={(event) => setBroadcastTitle(event.target.value)} className="border-border bg-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Mensagem</Label>
                <Textarea value={broadcastMessage} onChange={(event) => setBroadcastMessage(event.target.value)} className="min-h-24 resize-none border-border bg-input" />
              </div>
              <Button onClick={() => void sendBroadcast()} disabled={isSendingBroadcast} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="mr-2 h-4 w-4" />
                {isSendingBroadcast ? "Enviando..." : "Enviar para todos os usuários"}
              </Button>
            </div>
          )}

          {broadcasts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há avisos globais.</p>
          ) : (
            broadcasts.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.createdBy} • {new Intl.DateTimeFormat("pt-BR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}
                    </p>
                  </div>
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Aviso global</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{item.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {systemNotifications.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bell className="h-5 w-5 text-primary" />
              Avisos do sistema
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Eventos automáticos como expiração de links de aprovação do Drive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemNotifications.map((notification) => (
              <div key={notification.id} className="rounded-xl border border-border bg-background/70 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{notification.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(notification.createdAt))}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={notification.kind === "approval-expired" ? "/dashboard/kanban" : "/dashboard/drive"}>
                    <Button size="sm" variant="outline" className="border-border">
                      {notification.kind === "approval-expired" ? "Renovar link" : "Abrir contexto"}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5 text-primary" />
            Atualizações dos clientes
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Filtre por hoje, revisões, aprovações ou reprovações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["today", "revisions", "approvals", "rejections"] as const).map((filterKey) => (
              <Button
                key={filterKey}
                variant={activeFilter === filterKey ? "default" : "outline"}
                className={activeFilter === filterKey ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border"}
                onClick={() => setActiveFilter(filterKey)}
              >
                {filterKey === "today" && "Hoje"}
                {filterKey === "revisions" && "Revisões"}
                {filterKey === "approvals" && "Aprovações"}
                {filterKey === "rejections" && "Desaprovações"}
              </Button>
            ))}
          </div>

          {isLoading && (
            <PageLoadingState
              title="Carregando notificações"
              description="Estamos reunindo aprovações e pedidos de ajuste dos seus clientes."
            />
          )}

          {!isLoading && filteredTaskNotifications.length === 0 && (
            <PageEmptyState
              icon={<Bell className="h-7 w-7" />}
              title="Nenhuma notificação neste filtro"
              description="Gere links de aprovação na Agenda e as respostas dos clientes vão aparecer aqui com contexto."
              actionLabel="Abrir agenda"
              actionHref="/dashboard/kanban"
            />
          )}

          {!isLoading && filteredTaskNotifications.map((task) => {
            const review = parseReviewFeedback(task.feedbackCliente)
            const formattedPrice =
              review.priceUsd != null
                ? formatCurrency(review.priceUsd, "USD")
                : null
            const clientOpinion =
              review.revisionItems.length > 0
                ? review.revisionItems.map((item) => item.note).join(" | ")
                : task.statusCliente === "concluido"
                  ? "O cliente aprovou o vídeo."
                  : "O cliente desaprovou o vídeo."

            return (
              <div key={task.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{task.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.clienteNome} • {new Intl.DateTimeFormat("pt-BR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(task.updatedAt ?? Date.now()))}
                    </p>
                  </div>
                  <Badge className={task.statusCliente === "concluido" ? "bg-primary/15 text-primary" : "bg-red-500/15 text-red-400"}>
                    {task.statusCliente === "concluido" ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Aprovado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Pedido de ajuste
                      </span>
                    )}
                  </Badge>
                </div>

                {formattedPrice && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Valor do projeto: <span className="font-medium text-foreground">{formattedPrice}</span>
                  </p>
                )}

                <p className="mt-3 text-sm text-muted-foreground">
                  Opinião do cliente: <span className="font-medium text-foreground">{clientOpinion}</span>
                </p>

                {review.revisionItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Detalhes na timeline</p>
                    {review.revisionItems.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                        <p className="font-medium text-foreground">{formatTimestamp(item.timestamp)}</p>
                        <p className="mt-1 text-muted-foreground">{item.note}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/dashboard/kanban?taskId=${task.id}`}>
                    <Button variant="outline" className="border-border">Abrir projeto</Button>
                  </Link>
                  <Link href={task.statusCliente === "desaprovado" ? `/dashboard/kanban?taskId=${task.id}` : "/dashboard/financeiro"}>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {task.statusCliente === "desaprovado" ? "Responder revisão" : "Registrar pagamento"}
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
