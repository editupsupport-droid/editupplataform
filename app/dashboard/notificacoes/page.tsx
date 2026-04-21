"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bell, CheckCircle2, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppSession } from "@/components/app/app-provider"
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

export default function NotificationsPage() {
  const { currentUser } = useAppSession()
  const [tarefas, setTarefas] = useState<WorkspaceTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackError, setFeedbackError] = useState("")

  useEffect(() => {
    if (!currentUser) return
    const cachedTasks = getCachedWorkspaceTasks(currentUser.id)

    if (cachedTasks) {
      setTarefas(cachedTasks)
      setIsLoading(false)
    }

    const syncTasks = async (showLoader = false) => {
      try {
        if (showLoader) {
          setIsLoading(true)
        }
        setFeedbackError("")
        const loadedTasks = await fetchWorkspaceTasks(currentUser.id, { force: true })
        setTarefas(loadedTasks)
      } catch (error) {
        console.error(error)
        setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar as notificações.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!cachedTasks) {
      void syncTasks(true)
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

  const notifications = useMemo(
    () =>
      tarefas
        .filter((task) => task.statusCliente && task.statusCliente !== "pendente")
        .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()),
    [tarefas]
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
        <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          Toda aprovação e todo pedido de ajuste aparece aqui com contexto.
        </div>
      </div>

      <FeedbackBanner message={feedbackError} type="error" />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5 text-primary" />
            Atualizações dos clientes
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Aprovações e pedidos de alteração das suas entregas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <PageLoadingState
              title="Carregando notificações"
              description="Estamos reunindo aprovações e pedidos de ajuste dos seus clientes."
            />
          )}

          {!isLoading && notifications.length === 0 && (
            <PageEmptyState
              icon={<Bell className="h-7 w-7" />}
              title="Ainda não há respostas dos clientes"
              description="Gere um link de aprovação na Agenda e as respostas começam a aparecer aqui com contexto."
              actionLabel="Abrir agenda"
              actionHref="/dashboard/kanban"
            />
          )}

          {!isLoading && notifications.map((task) => (
            <div key={task.id} className="rounded-2xl border border-border bg-background p-4">
              {(() => {
                const review = parseReviewFeedback(task.feedbackCliente)
                const formattedPrice =
                  review.priceUsd != null
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(review.priceUsd)
                    : null

                return (
                  <>
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
                      Cliente aprovou
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Cliente pediu ajustes
                    </span>
                  )}
                </Badge>
              </div>
              {formattedPrice && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Valor do projeto:{" "}
                  <span className="font-medium text-foreground">{formattedPrice}</span>
                </p>
              )}
              {review.revisionItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Ajustes pedidos</p>
                  {review.revisionItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <p className="font-medium text-foreground">{formatTimestamp(item.timestamp)}</p>
                      <p className="mt-1 text-muted-foreground">{item.note}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Link href="/dashboard/kanban">
                  <Button variant="outline" className="border-border">Abrir agenda</Button>
                </Link>
              </div>
                  </>
                )
              })()}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
