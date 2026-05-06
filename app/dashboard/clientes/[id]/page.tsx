"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, ExternalLink, FolderOpen, Link2, TimerReset, UserRound, Wallet } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"
import { useAppPreferences } from "@/components/app/preferences-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageEmptyState } from "@/components/dashboard/page-empty-state"
import { PageLoadingState } from "@/components/dashboard/page-loading-state"
import {
  fetchFinanceTransactions,
  fetchWorkspaceClients,
  fetchWorkspaceTasks,
  type FinanceTransaction,
} from "@/lib/workspace-db"
import { WorkspaceClient, WorkspaceTask } from "@/lib/workspace-store"
import { calculateClientHealth, createDefaultClientProfile, formatTimelineDate, getNextTaskAction } from "@/lib/workflow-insights"

export default function Cliente360Page() {
  const params = useParams<{ id: string }>()
  const { currentUser } = useAppSession()
  const { formatCurrency } = useAppPreferences()
  const [clientes, setClientes] = useState<WorkspaceClient[]>([])
  const [tarefas, setTarefas] = useState<WorkspaceTask[]>([])
  const [transacoes, setTransacoes] = useState<FinanceTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const clientId = typeof params.id === "string" ? params.id : ""

  useEffect(() => {
    if (!currentUser) return

    const loadClientContext = async () => {
      try {
        setIsLoading(true)
        const [loadedClients, loadedTasks, loadedTransactions] = await Promise.all([
          fetchWorkspaceClients(currentUser.id, { force: true }),
          fetchWorkspaceTasks(currentUser.id, { force: true }),
          fetchFinanceTransactions(currentUser.id),
        ])
        setClientes(loadedClients)
        setTarefas(loadedTasks)
        setTransacoes(loadedTransactions)
      } finally {
        setIsLoading(false)
      }
    }

    void loadClientContext()
  }, [currentUser])

  const cliente = useMemo(() => clientes.find((item) => item.id === clientId) ?? null, [clientId, clientes])
  const clientTasks = useMemo(
    () => tarefas.filter((task) => task.clienteId === clientId || task.clienteNome === cliente?.nome),
    [cliente?.nome, clientId, tarefas]
  )
  const clientTransactions = useMemo(
    () => transacoes.filter((item) => item.cliente === cliente?.nome),
    [cliente?.nome, transacoes]
  )
  const revenue = clientTransactions
    .filter((item) => item.tipo === "entrada")
    .reduce((total, item) => total + item.valor, 0)
  const activeApprovals = clientTasks.filter((task) => task.linkAprovacao && task.statusCliente === "pendente")
  const activeProjects = clientTasks.filter((task) => task.colunaId !== "concluido" && task.statusCliente !== "concluido")
  const completedProjects = clientTasks.filter((task) => task.colunaId === "concluido" || task.statusCliente === "concluido")
  const averageTicket = completedProjects.length > 0 ? revenue / completedProjects.length : revenue
  const profile = cliente?.perfilOperacional ?? createDefaultClientProfile()
  const health = cliente ? calculateClientHealth(cliente, clientTasks, clientTransactions) : null

  if (!currentUser) return null

  if (isLoading) {
    return <PageLoadingState title="Carregando CRM 360" description="Estamos reunindo projetos, financeiro e links ativos deste cliente." />
  }

  if (!cliente) {
    return (
      <PageEmptyState
        icon={<UserRound className="h-7 w-7" />}
        title="Cliente não encontrado"
        description="Este cliente pode ter sido removido ou ainda não sincronizou."
        actionLabel="Voltar para Clientes"
        actionHref="/dashboard/clientes"
      />
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/clientes" className="inline-flex">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Clientes
        </Button>
      </Link>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-background/70 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-secondary bg-cover bg-center text-xl font-semibold text-foreground"
                style={cliente.fotoUrl ? { backgroundImage: `url(${cliente.fotoUrl})` } : undefined}
              >
                {!cliente.fotoUrl && cliente.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-foreground">{cliente.nome}</h1>
                <p className="text-muted-foreground">
                  {cliente.codigoPais} {cliente.telefone} · {profile.tipoConteudo || "Perfil operacional em construção"}
                </p>
              </div>
            </div>
            {health && (
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className={`text-sm font-semibold ${health.tone}`}>{health.label}</p>
                <p className="text-xs text-muted-foreground">{health.reason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
          <Card className="border-border bg-background">
            <CardContent className="p-4">
              <Wallet className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Faturamento acumulado</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(revenue)}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-background">
            <CardContent className="p-4">
              <CheckCircle2 className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Projetos concluídos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{completedProjects.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-background">
            <CardContent className="p-4">
              <Wallet className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Ticket médio</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(averageTicket || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-background">
            <CardContent className="p-4">
              <TimerReset className="mb-3 h-5 w-5 text-amber-400" />
              <p className="text-sm text-muted-foreground">Projetos ativos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{activeProjects.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-background">
            <CardContent className="p-4">
              <FolderOpen className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Pasta do Drive</p>
              <p className="mt-1 truncate text-sm font-medium text-foreground">{cliente.driveFolderName || "Não vinculada"}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Projetos do cliente</CardTitle>
            <CardDescription className="text-muted-foreground">Histórico e próximas ações em uma visão única.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum projeto vinculado a este cliente ainda.</p>
            ) : (
              clientTasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{task.titulo}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{getNextTaskAction(task)}</p>
                    </div>
                    <Badge variant="outline" className="w-fit">{task.colunaId}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/dashboard/kanban?taskId=${task.id}`}>
                      <Button size="sm" variant="outline" className="border-border">Abrir projeto</Button>
                    </Link>
                    {task.linkAprovacao && (
                      <Link href={task.linkAprovacao} target="_blank">
                        <Button size="sm" variant="outline">
                          Link de aprovação
                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Briefing fixo</CardTitle>
              <CardDescription className="text-muted-foreground">Memória operacional para não perguntar a mesma coisa duas vezes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {[
                ["Conteúdo", profile.tipoConteudo || "Não definido"],
                ["Formato padrão", profile.formatoPadrao || "Não definido"],
                ["Prazo habitual", profile.prazoHabitual || "Não definido"],
                ["Exigência", profile.nivelExigencia || "Não definida"],
                ["Revisões médias", String(profile.revisoesMedias ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-background px-3 py-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-medium text-foreground">{value}</p>
                </div>
              ))}
              {profile.observacoes ? (
                <div className="rounded-lg border border-border bg-background px-3 py-2">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="mt-1 leading-6 text-foreground">{profile.observacoes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Pasta e aprovações</CardTitle>
              <CardDescription className="text-muted-foreground">Atalhos operacionais do cliente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cliente.linkDrive || cliente.driveFolderId ? (
                <Link href={cliente.linkDrive || `https://drive.google.com/drive/folders/${cliente.driveFolderId}`} target="_blank">
                  <Button variant="outline" className="w-full justify-between border-border">
                    Abrir pasta do Drive
                    <Link2 className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma pasta vinculada.</p>
              )}

              {activeApprovals.map((task) => (
                <Link key={task.id} href={task.linkAprovacao ?? ""} target="_blank" className="block">
                  <Button variant="secondary" className="w-full justify-between">
                    {task.titulo}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Linha do tempo recente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientTasks.flatMap((task) => task.timeline ?? []).slice(0, 6).length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há eventos registrados.</p>
              ) : (
                clientTasks
                  .flatMap((task) => task.timeline ?? [])
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 6)
                  .map((event) => (
                    <div key={event.id} className="rounded-xl border border-border bg-background p-3">
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatTimelineDate(event.createdAt)}</p>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
