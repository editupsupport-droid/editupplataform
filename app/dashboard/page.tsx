"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ComponentProps } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, FileText, FolderOpen, MessageCircle, RotateCcw, Wallet } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAppSession } from "@/components/app/app-provider"
import { useAppPreferences } from "@/components/app/preferences-provider"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { PageEmptyState } from "@/components/dashboard/page-empty-state"
import { PageLoadingState } from "@/components/dashboard/page-loading-state"
import {
  fetchFinanceTransactions,
  fetchFixedExpenses,
  fetchWorkspaceClients,
  fetchWorkspaceTasks,
  getCachedFinanceTransactions,
  getCachedFixedExpenses,
  getCachedWorkspaceClients,
  getCachedWorkspaceTasks,
  subscribeWorkspaceSync,
  type FinanceTransaction,
  type FixedExpense,
} from "@/lib/workspace-db"
import type { WorkspaceClient, WorkspaceTask } from "@/lib/workspace-store"
import { cn } from "@/lib/utils"

const now = new Date()

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ED"

const isSameMonth = (date: Date, compareTo: Date) =>
  date.getFullYear() === compareTo.getFullYear() && date.getMonth() === compareTo.getMonth()

const getTaskDate = (task: WorkspaceTask) => new Date(task.updatedAt || task.prazo || now.toISOString())

const getDeliveredTasks = (tasks: WorkspaceTask[]) =>
  tasks.filter((task) => task.statusCliente === "concluido" || task.colunaId === "concluido")

const parseProjectValue = (task: WorkspaceTask) => {
  const normalized = task.escopo?.valorCombinado?.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date))

const statusMeta = (task: WorkspaceTask) => {
  if (task.statusCliente === "concluido" || task.colunaId === "concluido") {
    return { label: "Concluído", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" }
  }

  if (task.statusCliente === "desaprovado" || task.colunaId === "desaprovado") {
    return { label: "Refação", className: "border-amber-500/20 bg-amber-500/10 text-amber-500" }
  }

  if (task.colunaId === "waiting-response") {
    return { label: "Aguardando Aprovação", className: "border-indigo-500/20 bg-indigo-500/10 text-indigo-500" }
  }

  if (task.colunaId === "em-producao") {
    return { label: "Produção", className: "border-border bg-secondary text-foreground" }
  }

  return { label: "Agendado", className: "border-border bg-secondary text-muted-foreground" }
}

const deadlineTone = (deadline: string) => {
  if (!deadline) return "text-muted-foreground"
  const hoursLeft = (new Date(deadline).getTime() - Date.now()) / 36e5
  if (hoursLeft < 24) return "text-rose-500"
  if (hoursLeft <= 72) return "text-amber-500"
  return "text-emerald-500"
}

const DashboardCard = ({ className, ...props }: ComponentProps<typeof Card>) => (
  <Card
    className={cn(
      "rounded-[12px] border border-border bg-[var(--exec-card)] text-[var(--exec-text)] shadow-[var(--exec-shadow)]",
      className
    )}
    {...props}
  />
)

export default function DashboardPage() {
  const router = useRouter()
  const { currentUser } = useAppSession()
  const { formatCurrency, monthlyRevenueGoal } = useAppPreferences()
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [clients, setClients] = useState<WorkspaceClient[]>([])
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackError, setFeedbackError] = useState("")

  useEffect(() => {
    if (!currentUser) return

    const cachedTasks = getCachedWorkspaceTasks(currentUser.id)
    const cachedClients = getCachedWorkspaceClients(currentUser.id)
    const cachedTransactions = getCachedFinanceTransactions(currentUser.id)
    const cachedExpenses = getCachedFixedExpenses(currentUser.id)

    if (cachedTasks) setTasks(cachedTasks)
    if (cachedClients) setClients(cachedClients)
    if (cachedTransactions) setTransactions(cachedTransactions)
    if (cachedExpenses) setFixedExpenses(cachedExpenses)
    if (cachedTasks || cachedClients || cachedTransactions || cachedExpenses) setIsLoading(false)

    const syncDashboard = async (showLoader = false) => {
      try {
        if (showLoader) setIsLoading(true)
        setFeedbackError("")
        const [nextTasks, nextClients, nextTransactions, nextExpenses] = await Promise.all([
          fetchWorkspaceTasks(currentUser.id, { force: true }),
          fetchWorkspaceClients(currentUser.id, { force: true }),
          fetchFinanceTransactions(currentUser.id),
          fetchFixedExpenses(currentUser.id),
        ])
        setTasks(nextTasks)
        setClients(nextClients)
        setTransactions(nextTransactions)
        setFixedExpenses(nextExpenses)
      } catch (error) {
        console.error(error)
        setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar a dashboard.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!cachedTasks && !cachedClients && !cachedTransactions && !cachedExpenses) {
      void syncDashboard(true)
    } else {
      void syncDashboard()
    }

    return subscribeWorkspaceSync(() => {
      const nextTasks = getCachedWorkspaceTasks(currentUser.id)
      const nextClients = getCachedWorkspaceClients(currentUser.id)
      const nextTransactions = getCachedFinanceTransactions(currentUser.id)
      const nextExpenses = getCachedFixedExpenses(currentUser.id)
      if (nextTasks) setTasks(nextTasks)
      if (nextClients) setClients(nextClients)
      if (nextTransactions) setTransactions(nextTransactions)
      if (nextExpenses) setFixedExpenses(nextExpenses)
      setIsLoading(false)
    })
  }, [currentUser])

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])
  const clientByName = useMemo(() => new Map(clients.map((client) => [client.nome, client])), [clients])

  const summary = useMemo(() => {
    const currentMonthTransactions = transactions.filter((item) => isSameMonth(new Date(item.data), now))
    const monthlyFixedCosts = fixedExpenses.reduce((sum, item) => sum + item.valor, 0)
    const monthlyRevenue =
      currentMonthTransactions.reduce((sum, item) => sum + (item.tipo === "entrada" ? item.valor : -item.valor), 0) - monthlyFixedCosts
    const deliveredThisMonth = getDeliveredTasks(tasks).filter((task) => isSameMonth(getTaskDate(task), now)).length
    const activeProjects = tasks.filter((task) => task.colunaId === "em-producao").length
    const revisionCount = tasks.filter((task) => task.statusCliente === "desaprovado" || task.colunaId === "desaprovado").length
    const goalProgress = monthlyRevenueGoal > 0 ? Math.min(100, Math.round((Math.max(monthlyRevenue, 0) / monthlyRevenueGoal) * 100)) : 0
    const revenueVsGoal = monthlyRevenueGoal > 0 ? Math.round(((monthlyRevenue - monthlyRevenueGoal) / monthlyRevenueGoal) * 100) : 0

    return {
      monthlyRevenue,
      deliveredThisMonth,
      activeProjects,
      revisionCount,
      goalProgress,
      revenueVsGoal,
    }
  }, [fixedExpenses, monthlyRevenueGoal, tasks, transactions])

  const productionData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(now.getDate() - (6 - index))
      return date
    })

    return days.map((date) => {
      const delivered = getDeliveredTasks(tasks).filter((task) => {
        const taskDate = getTaskDate(task)
        return taskDate.toDateString() === date.toDateString()
      }).length

      return {
        day: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
        delivered,
      }
    })
  }, [tasks])

  const deadlineDays = useMemo(() => {
    const activeTasks = tasks.filter((task) => task.colunaId !== "concluido" && task.prazo)
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const firstDay = new Date(currentYear, currentMonth, 1)
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()
    const leadingBlanks = firstDay.getDay()
    const days = [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1
        const items = activeTasks.filter((task) => {
          const deadline = new Date(task.prazo)
          return deadline.getFullYear() === currentYear && deadline.getMonth() === currentMonth && deadline.getDate() === day
        })
        return { day, items }
      }),
    ]

    return days
  }, [tasks])

  const recentEdits = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => new Date(b.updatedAt ?? b.prazo ?? 0).getTime() - new Date(a.updatedAt ?? a.prazo ?? 0).getTime())
        .slice(0, 7),
    [tasks]
  )

  const dueSoonTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.colunaId !== "concluido" && task.prazo)
        .filter((task) => {
          const hoursLeft = (new Date(task.prazo).getTime() - Date.now()) / 36e5
          return hoursLeft >= 0 && hoursLeft <= 72
        })
        .sort((a, b) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime()),
    [tasks]
  )
  const pendingApprovalTasks = useMemo(
    () => tasks.filter((task) => task.linkAprovacao && task.statusCliente === "pendente" && task.colunaId !== "concluido"),
    [tasks]
  )
  const clientsWithoutDrive = useMemo(
    () => clients.filter((client) => !client.linkDrive && !client.driveFolderId),
    [clients]
  )
  const expectedRevenue = useMemo(
    () =>
      tasks
        .filter((task) => task.colunaId !== "concluido")
        .reduce((total, task) => total + parseProjectValue(task), 0),
    [tasks]
  )

  const kpis = [
    {
      title: "Faturamento Real",
      value: formatCurrency(summary.monthlyRevenue),
      helper: `${summary.revenueVsGoal >= 0 ? "+" : ""}${summary.revenueVsGoal}% vs média`,
      icon: Wallet,
      tone: "text-primary",
    },
    {
      title: "Projetos Ativos",
      value: String(summary.activeProjects),
      helper: "em produção agora",
      icon: BriefcaseBusiness,
      tone: "text-foreground",
    },
    {
      title: "Vídeos Entregues",
      value: String(summary.deliveredThisMonth),
      helper: "finalizados no mês",
      icon: CheckCircle2,
      tone: "text-emerald-500",
    },
    {
      title: "Taxa de Refação",
      value: String(summary.revisionCount),
      helper: "voltaram para ajuste",
      icon: RotateCcw,
      tone: "text-amber-500",
    },
  ]

  const actionCards = [
    {
      title: "Prazos nas próximas 72h",
      value: String(dueSoonTasks.length),
      helper: dueSoonTasks[0] ? `${dueSoonTasks[0].titulo} vence primeiro` : "Nenhum prazo crítico agora",
      href: dueSoonTasks[0] ? `/dashboard/kanban?taskId=${encodeURIComponent(dueSoonTasks[0].id)}` : "/dashboard/kanban",
      action: dueSoonTasks[0] ? "Abrir entrega" : "Abrir produção",
      icon: Clock3,
    },
    {
      title: "Aprovações aguardando cliente",
      value: String(pendingApprovalTasks.length),
      helper: pendingApprovalTasks[0] ? pendingApprovalTasks[0].clienteNome : "Nenhum link aguardando resposta",
      href: pendingApprovalTasks[0] ? `/dashboard/kanban?taskId=${encodeURIComponent(pendingApprovalTasks[0].id)}` : "/dashboard/notificacoes",
      action: pendingApprovalTasks[0] ? "Ver link" : "Ver notificações",
      icon: MessageCircle,
    },
    {
      title: "Clientes sem Drive",
      value: String(clientsWithoutDrive.length),
      helper: clientsWithoutDrive[0] ? `${clientsWithoutDrive[0].nome} ainda não tem pasta` : "Todos os clientes estão organizados",
      href: clientsWithoutDrive[0] ? `/dashboard/clientes/${clientsWithoutDrive[0].id}` : "/dashboard/clientes",
      action: clientsWithoutDrive[0] ? "Vincular pasta" : "Abrir clientes",
      icon: FolderOpen,
    },
    {
      title: "Receita prevista em produção",
      value: formatCurrency(expectedRevenue),
      helper: "Somatório dos projetos ainda abertos",
      href: "/dashboard/financeiro",
      action: "Abrir receita",
      icon: FileText,
    },
  ]

  if (!currentUser) return null

  const openTask = (taskId: string) => {
    router.push(`/dashboard/kanban?taskId=${encodeURIComponent(taskId)}`)
  }

  return (
    <div className="executive-dashboard space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--exec-muted)]">Bento Grid</p>
          <h1 className="text-3xl font-semibold text-[var(--exec-text)]">Dashboard</h1>
        </div>
        <div className="rounded-[12px] border border-border bg-[var(--exec-card)] px-4 py-2 text-sm text-[var(--exec-muted)] shadow-[var(--exec-shadow)]">
          Média de faturamento: <span className="font-semibold text-[var(--exec-text)]">{formatCurrency(monthlyRevenueGoal)}</span>
        </div>
      </div>

      <FeedbackBanner message={feedbackError} type="error" />

      {isLoading ? (
        <DashboardCard>
          <CardContent className="p-6">
            <PageLoadingState title="Carregando dashboard" description="Organizando prazos, faturamento e status dos vídeos." />
          </CardContent>
        </DashboardCard>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {actionCards.map((item) => (
              <DashboardCard key={item.title} className="bg-card">
                <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </div>
                    <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.helper}</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="justify-between">
                    <Link href={item.href}>
                      {item.action}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </DashboardCard>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <DashboardCard key={kpi.title}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[var(--exec-muted)]">{kpi.title}</p>
                      <p className={cn("mt-3 text-3xl font-semibold", kpi.tone)}>{kpi.value}</p>
                      <p className="mt-2 text-xs font-medium text-[var(--exec-muted)]">{kpi.helper}</p>
                    </div>
                    <div className="rounded-[12px] border border-border bg-background p-2.5">
                      <kpi.icon className={cn("h-4 w-4", kpi.tone)} />
                    </div>
                  </div>
                </CardContent>
              </DashboardCard>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <DashboardCard className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-[var(--exec-text)]">Gráfico de Produção</CardTitle>
                <CardDescription>Volume de vídeos entregues nos últimos 7 dias.</CardDescription>
              </CardHeader>
              <CardContent className="h-[360px] px-4 pb-5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionData} margin={{ left: -20, right: 12, top: 12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--exec-grid)" opacity={0.85} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "rgba(55,53,47,0.08)" }}
                      contentStyle={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        background: "var(--exec-card)",
                        color: "var(--exec-text)",
                      }}
                    />
                    <Bar dataKey="delivered" fill="var(--primary)" radius={[12, 12, 4, 4]} animationDuration={700} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </DashboardCard>

            <div className="grid gap-5">
              <DashboardCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[var(--exec-text)]">Calendário de Deadlines</CardTitle>
                  <CardDescription>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
                    {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
                      <span key={`${day}-${index}`} className="py-1">{day}</span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {deadlineDays.map((item, index) =>
                      item ? (
                        <div
                          key={item.day}
                          className={cn(
                            "flex aspect-square items-center justify-center rounded-[12px] border text-xs font-medium",
                            item.items.length > 0
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-transparent bg-background text-muted-foreground",
                            item.day === now.getDate() && "ring-1 ring-primary"
                          )}
                          title={item.items.map((task) => task.titulo).join(", ")}
                        >
                          {item.day}
                        </div>
                      ) : (
                        <div key={`blank-${index}`} />
                      )
                    )}
                  </div>
                </CardContent>
              </DashboardCard>

              <DashboardCard>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base text-[var(--exec-text)]">Meta de Faturamento</CardTitle>
                </CardHeader>
                <CardContent className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="58%"
                      innerRadius="72%"
                      outerRadius="96%"
                      barSize={16}
                      data={[{ name: "Meta", value: summary.goalProgress || 1 }]}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar background={{ fill: "var(--secondary)" }} dataKey="value" cornerRadius={12} fill="var(--primary)" />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-x-0 top-[4.7rem] text-center">
                    <p className="text-3xl font-semibold text-[var(--exec-text)]">{summary.goalProgress}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(summary.monthlyRevenue)} / {formatCurrency(monthlyRevenueGoal)}</p>
                  </div>
                  <Progress value={summary.goalProgress} className="mt-2 h-2 rounded-full" />
                </CardContent>
              </DashboardCard>
            </div>
          </div>

          <DashboardCard>
            <CardHeader>
              <CardTitle className="text-[var(--exec-text)]">Recent Edits</CardTitle>
              <CardDescription>Projetos recentes, status, prazo e valor combinado.</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {recentEdits.length === 0 ? (
                <PageEmptyState
                  icon={<CalendarDays className="h-7 w-7" />}
                  title="Nenhum projeto recente"
                  description="Quando você criar vídeos na agenda, eles aparecem aqui."
                  actionLabel="Abrir agenda"
                  actionHref="/dashboard/kanban"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Cliente</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Prazo</TableHead>
                      <TableHead className="text-muted-foreground">Valor</TableHead>
                      <TableHead className="text-right text-muted-foreground">Abrir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEdits.map((task) => {
                      const status = statusMeta(task)
                      const client = clientById.get(task.clienteId) ?? clientByName.get(task.clienteNome)
                      const transaction = transactions.find((item) => item.cliente === task.clienteNome && item.tipo === "entrada")
                      const value = parseProjectValue(task) || transaction?.valor || 0

                      return (
                        <TableRow
                          key={task.id}
                          className="cursor-pointer border-border hover:bg-secondary/60"
                          role="link"
                          tabIndex={0}
                          onClick={() => openTask(task.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              openTask(task.id)
                            }
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border">
                                {client?.fotoUrl ? <AvatarImage src={client.fotoUrl} alt={task.clienteNome} className="object-cover" /> : null}
                                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                                  {getInitials(task.clienteNome || task.titulo)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-[var(--exec-text)]">{task.clienteNome || "Cliente"}</p>
                                <p className="text-xs text-muted-foreground">{task.titulo}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("rounded-[8px] border px-2.5 py-1", status.className)}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("font-medium", deadlineTone(task.prazo))}>
                            {task.prazo ? formatDate(task.prazo) : "Sem prazo"}
                          </TableCell>
                          <TableCell className="font-semibold text-[var(--exec-text)]">
                            {value > 0 ? formatCurrency(value) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/dashboard/kanban?taskId=${encodeURIComponent(task.id)}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </DashboardCard>
        </>
      )}
    </div>
  )
}
