import type {
  WorkspaceClient,
  WorkspaceClientProfile,
  WorkspaceTask,
  WorkspaceTaskChecklist,
  WorkspaceTaskScope,
  WorkspaceTimelineEvent,
} from "@/lib/workspace-store"
import type { FinanceTransaction } from "@/lib/workspace-db"

export const createDefaultClientProfile = (): WorkspaceClientProfile => ({
  tipoConteudo: "",
  formatoPadrao: "",
  prazoHabitual: "",
  nivelExigencia: "medio",
  revisoesMedias: 2,
  observacoes: "",
})

export const createDefaultTaskChecklist = (): WorkspaceTaskChecklist => ({
  briefingRecebido: false,
  arquivosRecebidos: false,
  referenciaAprovada: false,
  formatoDefinido: false,
  prazoConfirmado: false,
  pagamentoAlinhado: false,
})

export const createDefaultTaskScope = (): WorkspaceTaskScope => ({
  quantidadeVideos: "",
  duracaoEsperada: "",
  formatos: "",
  revisoesIncluidas: "",
  valorCombinado: "",
  extrasCombinados: "",
  prazoPrometido: "",
})

export const createTimelineEvent = (
  type: WorkspaceTimelineEvent["type"],
  title: string,
  description: string,
  createdAt = new Date().toISOString()
): WorkspaceTimelineEvent => ({
  id: crypto.randomUUID(),
  type,
  title,
  description,
  createdAt,
})

export const getChecklistProgress = (checklist?: WorkspaceTaskChecklist | null) => {
  if (!checklist) return 0
  const total = Object.keys(checklist).length
  const completed = Object.values(checklist).filter(Boolean).length
  return Math.round((completed / total) * 100)
}

export const getScopeCompletion = (scope?: WorkspaceTaskScope | null) => {
  if (!scope) return 0
  const values = Object.values(scope).filter((value) => value.trim())
  return Math.round((values.length / Object.keys(scope).length) * 100)
}

export const getNextTaskAction = (task: WorkspaceTask) => {
  const checklistProgress = getChecklistProgress(task.checklist)
  const scopeCompletion = getScopeCompletion(task.escopo)

  if (checklistProgress < 100) return "Finalizar kickoff antes da edição"
  if (scopeCompletion < 100) return "Completar escopo combinado"
  if (task.colunaId === "agenda") return "Mover para produção"
  if (task.colunaId === "em-producao" && !task.linkAprovacao) return "Gerar link de aprovação"
  if (task.colunaId === "waiting-response") return "Aguardar resposta do cliente"
  if (task.colunaId === "desaprovado") return "Aplicar revisões do cliente"
  return "Fluxo em dia"
}

export const summarizeScope = (scope?: WorkspaceTaskScope | null) => {
  if (!scope) return ""
  const pieces = [scope.quantidadeVideos, scope.duracaoEsperada, scope.formatos].filter(Boolean)
  return pieces.join(" • ")
}

export const formatTimelineDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))

export const calculateClientHealth = (
  client: WorkspaceClient,
  tasks: WorkspaceTask[],
  transactions: FinanceTransaction[]
) => {
  const clientTasks = tasks.filter((task) => task.clienteId === client.id || task.clienteNome === client.nome)
  const entradas = transactions
    .filter((item) => item.tipo === "entrada" && item.cliente === client.nome)
    .reduce((sum, item) => sum + item.valor, 0)
  const refacoes = clientTasks.filter((task) => task.statusCliente === "desaprovado").length
  const pendencias = clientTasks.filter((task) => task.colunaId !== "concluido").length
  const profile = client.perfilOperacional ?? createDefaultClientProfile()

  let score = 0
  if (entradas >= 1500) score += 2
  else if (entradas >= 500) score += 1
  if (refacoes === 0) score += 1
  if (pendencias <= 1) score += 1
  if (profile.nivelExigencia === "alto") score -= 2
  if (profile.revisoesMedias >= 4) score -= 1

  if (score >= 3) {
    return { label: "Saudável", tone: "text-primary", reason: "Bom retorno com baixa fricção operacional." }
  }
  if (score >= 1) {
    return { label: "Estável", tone: "text-yellow-400", reason: "Cliente viável, mas vale acompanhar de perto." }
  }
  return { label: "Precisa de atenção", tone: "text-red-400", reason: "Exige alto esforço para o retorno percebido." }
}
