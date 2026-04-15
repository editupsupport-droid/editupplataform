"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, CheckCircle2, RefreshCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppSession } from "@/components/app/app-provider"
import { fetchWorkspaceTasks, markNotificationsAsRead, subscribeWorkspaceSync } from "@/lib/workspace-db"
import { WorkspaceTask } from "@/lib/workspace-store"

export default function NotificacoesPage() {
  const { currentUser } = useAppSession()
  const [tarefas, setTarefas] = useState<WorkspaceTask[]>([])

  useEffect(() => {
    if (!currentUser) return

    const syncTasks = async () => {
      try {
        const loadedTasks = await fetchWorkspaceTasks(currentUser.id)
        setTarefas(loadedTasks)
      } catch (error) {
        console.error(error)
      }
    }

    void syncTasks()
    void markNotificationsAsRead(currentUser.id)

    return subscribeWorkspaceSync(() => {
      void syncTasks()
    })
  }, [currentUser])

  const notificacoes = useMemo(
    () =>
      tarefas
        .filter((task) => task.statusCliente && task.statusCliente !== "pendente")
        .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()),
    [tarefas]
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
        <p className="mt-1 text-muted-foreground">
          Aqui aparecem as respostas dos clientes sobre os vídeos enviados para aprovação.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5 text-primary" />
            Atualizações do cliente
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Aprovações e pedidos de refação das entregas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificacoes.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              Ainda não há respostas de clientes por aqui.
            </div>
          )}

          {notificacoes.map((task) => (
            <div key={task.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{task.titulo}</p>
                  <p className="text-sm text-muted-foreground">{task.clienteNome}</p>
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
                      Cliente pediu refação
                    </span>
                  )}
                </Badge>
              </div>
              {task.feedbackCliente && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Feedback: {task.feedbackCliente}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
