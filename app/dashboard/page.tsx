"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CircleDollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppSession } from "@/components/app/app-provider"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { PageEmptyState } from "@/components/dashboard/page-empty-state"
import { PageLoadingState } from "@/components/dashboard/page-loading-state"
import {
  fetchFinanceTransactions,
  fetchFixedExpenses,
  fetchWorkspaceTasks,
  getCachedFinanceTransactions,
  getCachedFixedExpenses,
  getCachedWorkspaceTasks,
  subscribeWorkspaceSync,
  type FinanceTransaction,
  type FixedExpense,
} from "@/lib/workspace-db"
import { type WorkspaceTask } from "@/lib/workspace-store"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    day: "numeric",
  }).format(new Date(date))

export default function DashboardPage() {
  const { currentUser } = useAppSession()
  const [tarefas, setTarefas] = useState<WorkspaceTask[]>([])
  const [transacoes, setTransacoes] = useState<FinanceTransaction[]>([])
  const [gastosFixos, setGastosFixos] = useState<FixedExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackError, setFeedbackError] = useState("")

  useEffect(() => {
    if (!currentUser) return

    const cachedTasks = getCachedWorkspaceTasks(currentUser.id)
    const cachedTransactions = getCachedFinanceTransactions(currentUser.id)
    const cachedExpenses = getCachedFixedExpenses(currentUser.id)

    if (cachedTasks) {
      setTarefas(cachedTasks)
    }

    if (cachedTransactions) {
      setTransacoes(cachedTransactions)
    }

    if (cachedExpenses) {
      setGastosFixos(cachedExpenses)
    }

    if (cachedTasks || cachedTransactions || cachedExpenses) {
      setIsLoading(false)
    }

    const syncDashboard = async (showLoader = false) => {
      try {
        if (showLoader) {
          setIsLoading(true)
        }

        setFeedbackError("")

        const [nextTasks, nextTransactions, nextExpenses] = await Promise.all([
          fetchWorkspaceTasks(currentUser.id, { force: true }),
          fetchFinanceTransactions(currentUser.id),
          fetchFixedExpenses(currentUser.id),
        ])

        setTarefas(nextTasks)
        setTransacoes(nextTransactions)
        setGastosFixos(nextExpenses)
      } catch (error) {
        console.error(error)
        setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar o dashboard.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!cachedTasks && !cachedTransactions && !cachedExpenses) {
      void syncDashboard(true)
    } else {
      void syncDashboard()
    }

    return subscribeWorkspaceSync(() => {
      const nextTasks = getCachedWorkspaceTasks(currentUser.id)
      const nextTransactions = getCachedFinanceTransactions(currentUser.id)
      const nextExpenses = getCachedFixedExpenses(currentUser.id)

      if (nextTasks) {
        setTarefas(nextTasks)
      }

      if (nextTransactions) {
        setTransacoes(nextTransactions)
      }

      if (nextExpenses) {
        setGastosFixos(nextExpenses)
      }

      setIsLoading(false)
    })
  }, [currentUser])

  const dashboardSummary = useMemo(() => {
    const totalEntradas = transacoes
      .filter((item) => item.tipo === "entrada")
      .reduce((sum, item) => sum + item.valor, 0)

    const totalSaidas = transacoes
      .filter((item) => item.tipo === "saida")
      .reduce((sum, item) => sum + item.valor, 0)

    const totalFixos = gastosFixos.reduce((sum, item) => sum + item.valor, 0)
    const saldoLiquido = totalEntradas - totalSaidas - totalFixos

    const pendingTasks = tarefas.filter((task) => task.colunaId !== "concluido")
    const waitingApproval = tarefas.filter((task) => task.colunaId === "waiting-response")
    const revisionTasks = tarefas.filter((task) => task.statusCliente === "refazendo")
    const unreadNotifications = tarefas.filter(
      (task) => task.statusCliente && task.statusCliente !== "pendente" && !task.notificationRead
    )

    const nextDeadline = [...pendingTasks]
      .filter((task) => task.prazo)
      .sort((a, b) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime())[0]

    return {
      saldoLiquido,
      pendingTasks,
      waitingApproval,
      revisionTasks,
      unreadNotifications,
      nextDeadline,
    }
  }, [gastosFixos, tarefas, transacoes])

  const highlightCards = [
    {
      title: "O que pede atenção",
      value: `${dashboardSummary.waitingApproval.length + dashboardSummary.revisionTasks.length}`,
      description:
        dashboardSummary.revisionTasks.length > 0
          ? "Tarefas com pedido de ajuste ou aguardando resposta do cliente."
          : "Nada urgente no momento. O fluxo está sob controle.",
      icon: BellRing,
      href: "/dashboard/notificacoes",
      cta: "Abrir notificações",
    },
    {
      title: "Próxima entrega",
      value: dashboardSummary.nextDeadline ? formatDate(dashboardSummary.nextDeadline.prazo) : "Sem prazo",
      description: dashboardSummary.nextDeadline
        ? `${dashboardSummary.nextDeadline.titulo} para ${dashboardSummary.nextDeadline.clienteNome}`
        : "Adicione prazos nas tarefas para esta visão ficar mais útil.",
      icon: CalendarClock,
      href: "/dashboard/kanban",
      cta: "Abrir agenda",
    },
    {
      title: "Saldo líquido",
      value: formatCurrency(dashboardSummary.saldoLiquido),
      description:
        dashboardSummary.saldoLiquido < 0
          ? "Você gastou mais do que entrou após os custos fixos."
          : "O que sobra depois dos gastos variáveis e fixos.",
      icon: CircleDollarSign,
      href: "/dashboard/financeiro",
      cta: "Abrir finanças",
    },
  ]

  const recentTasks = useMemo(
    () =>
      [...tarefas]
        .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
        .slice(0, 4),
    [tarefas]
  )

  if (!currentUser) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Visão geral</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Só o essencial: o que pede atenção, o que vem a seguir e como está o caixa.
        </p>
      </div>

      <FeedbackBanner message={feedbackError} type="error" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {highlightCards.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.title} className="border-border bg-card/80">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardDescription className="text-muted-foreground">{item.title}</CardDescription>
                    <CardTitle className="mt-2 text-2xl font-semibold text-foreground">{item.value}</CardTitle>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-2.5">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
              </CardHeader>
              <CardContent>
                <Link href={item.href}>
                  <Button variant="ghost" className="h-auto px-0 text-sm text-foreground hover:bg-transparent">
                    {item.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Movimentação recente</CardTitle>
          <CardDescription className="text-muted-foreground">
            As entregas que tiveram atualização por último.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <PageLoadingState
              title="Carregando visão geral"
              description="Estamos organizando as tarefas e os números mais recentes para você."
            />
          )}

          {!isLoading && recentTasks.length === 0 && (
            <PageEmptyState
              icon={<CalendarClock className="h-7 w-7" />}
              title="Ainda não há movimentações"
              description="Assim que você criar ou atualizar entregas, elas aparecem aqui para facilitar sua leitura do dia."
              actionLabel="Abrir agenda"
              actionHref="/dashboard/kanban"
            />
          )}

          {!isLoading &&
            recentTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{task.titulo}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.clienteNome} {task.prazo ? `• prazo ${formatDate(task.prazo)}` : ""}
                    </p>
                  </div>
                  <div className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                    {task.colunaId === "agenda" && "Agendado"}
                    {task.colunaId === "em-producao" && "Em produção"}
                    {task.colunaId === "waiting-response" && "Aguardando"}
                    {task.colunaId === "refazendo" && "Refação"}
                    {task.colunaId === "concluido" && "Concluído"}
                  </div>
                </div>
                {task.descricao && <p className="mt-3 text-sm leading-6 text-muted-foreground">{task.descricao}</p>}
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
