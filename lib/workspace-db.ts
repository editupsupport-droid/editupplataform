"use client"

import { authFetch, isSupabaseConfigured } from "@/lib/supabase"
import {
  getWorkspaceClients,
  getWorkspaceClientPhoto,
  getWorkspaceClientProfile,
  getWorkspaceTaskMeta,
  getWorkspaceTasks,
  removeWorkspaceClientPhoto,
  removeWorkspaceClientProfile,
  removeWorkspaceTaskMeta,
  saveWorkspaceClients,
  saveWorkspaceTasks,
  setWorkspaceClientPhoto,
  setWorkspaceClientProfile,
  setWorkspaceTaskMeta,
  WorkspaceClient,
  WorkspaceTask,
} from "@/lib/workspace-store"
import {
  createDefaultClientProfile,
  createDefaultTaskChecklist,
  createDefaultTaskScope,
  createTimelineEvent,
} from "@/lib/workflow-insights"

const WORKSPACE_SYNC_EVENT = "astherisch-workspace-sync"
const workspaceClientsCache = new Map<string, WorkspaceClient[]>()
const workspaceTasksCache = new Map<string, WorkspaceTask[]>()
const financeTransactionsCache = new Map<string, FinanceTransaction[]>()
const fixedExpensesCache = new Map<string, FixedExpense[]>()
const pendingWorkspaceClientsRequests = new Map<string, Promise<WorkspaceClient[]>>()
const pendingWorkspaceTasksRequests = new Map<string, Promise<WorkspaceTask[]>>()
const pendingFinanceTransactionsRequests = new Map<string, Promise<FinanceTransaction[]>>()
const pendingFixedExpensesRequests = new Map<string, Promise<FixedExpense[]>>()

export interface FinanceTransaction {
  id: string
  tipo: "entrada" | "saida"
  valor: number
  descricao: string
  categoria: string
  cliente: string
  data: string
}

export interface FixedExpense {
  id: string
  nome: string
  valor: number
  categoria: string
}

type ClientRow = {
  id: string
  name: string
  phone: string | null
  country_code: string | null
  edit_level: WorkspaceClient["nivelEdicao"] | null
  average_duration: number | null
  frequency: string | null
  drive_link: string | null
  drive_folder_id: string | null
  drive_folder_name: string | null
  created_at: string
}

type TaskRow = {
  id: string
  title: string
  description: string | null
  client_id: string | null
  client_name: string | null
  due_date: string | null
  column_id: string
  drive_link: string | null
  approval_link: string | null
  approved: boolean | null
  client_feedback: string | null
  client_status: WorkspaceTask["statusCliente"] | null
  notification_read: boolean | null
  updated_at: string
}

type FinanceTransactionRow = {
  id: string
  kind: FinanceTransaction["tipo"]
  amount: number
  description: string
  category: string
  client_name: string | null
  transaction_date: string
}

type FixedExpenseRow = {
  id: string
  name: string
  amount: number
  category: string
}

const isBrowser = () => typeof window !== "undefined"
const FINANCE_TRANSACTIONS_KEY = "editup-finance-transactions"
const FIXED_EXPENSES_KEY = "editup-fixed-expenses"

const readLocalStorage = <T,>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback

  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

const writeLocalStorage = <T,>(key: string, value: T) => {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>()
  const deduped: T[] = []

  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue
    seen.add(item.id)
    deduped.push(item)
  }

  return deduped
}

const emitWorkspaceSync = () => {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(WORKSPACE_SYNC_EVENT))
}

export const subscribeWorkspaceSync = (callback: () => void) => {
  if (!isBrowser()) return () => {}

  window.addEventListener(WORKSPACE_SYNC_EVENT, callback)

  return () => {
    window.removeEventListener(WORKSPACE_SYNC_EVENT, callback)
  }
}

export const getCachedWorkspaceClients = (userId: string) => workspaceClientsCache.get(userId) ?? null
export const getCachedWorkspaceTasks = (userId: string) => workspaceTasksCache.get(userId) ?? null

const setCachedWorkspaceClients = (userId: string, clients: WorkspaceClient[]) => {
  workspaceClientsCache.set(userId, uniqueById(clients))
}

const setCachedWorkspaceTasks = (userId: string, tasks: WorkspaceTask[]) => {
  workspaceTasksCache.set(userId, uniqueById(tasks))
}

export const getCachedFinanceTransactions = (userId: string) => financeTransactionsCache.get(userId) ?? null
export const getCachedFixedExpenses = (userId: string) => fixedExpensesCache.get(userId) ?? null

const setCachedFinanceTransactions = (userId: string, items: FinanceTransaction[]) => {
  financeTransactionsCache.set(userId, uniqueById(items))
}

const setCachedFixedExpenses = (userId: string, items: FixedExpense[]) => {
  fixedExpensesCache.set(userId, uniqueById(items))
}

const mapClientRow = (row: ClientRow): WorkspaceClient => ({
  id: row.id,
  nome: row.name,
  fotoUrl: "",
  telefone: row.phone ?? "",
  codigoPais: row.country_code ?? "+55",
  nivelEdicao: row.edit_level ?? "simples",
  duracaoMedia: row.average_duration ?? 15,
  frequencia: row.frequency ?? "",
  linkDrive: row.drive_link ?? "",
  driveFolderId: row.drive_folder_id ?? "",
  driveFolderName: row.drive_folder_name ?? "",
  createdAt: row.created_at,
  perfilOperacional: createDefaultClientProfile(),
})

const mapTaskRow = (row: TaskRow): WorkspaceTask => ({
  id: row.id,
  titulo: row.title,
  descricao: row.description ?? "",
  clienteId: row.client_id ?? "",
  clienteNome: row.client_name ?? "",
  prazo: row.due_date ?? new Date().toISOString(),
  colunaId: row.column_id,
  linkDrive: row.drive_link ?? "",
  linkAprovacao: row.approval_link ?? "",
  aprovado: row.approved,
  feedbackCliente: row.client_feedback ?? "",
  statusCliente: row.client_status ?? "pendente",
  notificationRead: Boolean(row.notification_read),
  updatedAt: row.updated_at,
  checklist: createDefaultTaskChecklist(),
  escopo: createDefaultTaskScope(),
  timeline: [],
})

const mapTransactionRow = (row: FinanceTransactionRow): FinanceTransaction => ({
  id: row.id,
  tipo: row.kind,
  valor: Number(row.amount),
  descricao: row.description,
  categoria: row.category,
  cliente: row.client_name ?? "",
  data: row.transaction_date,
})

const mapFixedExpenseRow = (row: FixedExpenseRow): FixedExpense => ({
  id: row.id,
  nome: row.name,
  valor: Number(row.amount),
  categoria: row.category,
})

const readJsonResponse = async <T,>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? "Não foi possível concluir a solicitação.")
  }

  return payload as T
}

export const fetchWorkspaceClients = async (userId: string, options?: { force?: boolean }) => {
  const cachedClients = getCachedWorkspaceClients(userId)
  if (!options?.force && cachedClients) return cachedClients

  const pendingRequest = pendingWorkspaceClientsRequests.get(userId)
  if (pendingRequest) return pendingRequest

  if (!isSupabaseConfigured) {
    const clients = getWorkspaceClients()
    setCachedWorkspaceClients(userId, clients)
    return clients
  }

  const request = (async () => {
    try {
      const response = await authFetch("/api/clients")
      const payload = await readJsonResponse<{ clients: ClientRow[] }>(response)
      const clients = (payload.clients ?? []).map((row) => ({
        ...mapClientRow(row),
        fotoUrl: getWorkspaceClientPhoto(userId, row.id),
        perfilOperacional: getWorkspaceClientProfile(userId, row.id) ?? createDefaultClientProfile(),
      }))
      setCachedWorkspaceClients(userId, clients)
      return clients
    } finally {
      pendingWorkspaceClientsRequests.delete(userId)
    }
  })()

  pendingWorkspaceClientsRequests.set(userId, request)
  return request
}

export const upsertWorkspaceClient = async (userId: string, client: WorkspaceClient) => {
  if (!isSupabaseConfigured) {
    const currentClients = getWorkspaceClients()
    const exists = currentClients.some((item) => item.id === client.id)
    const nextClients = exists ? currentClients.map((item) => (item.id === client.id ? client : item)) : [client, ...currentClients]
    saveWorkspaceClients(nextClients)
    if (client.id) {
      setWorkspaceClientPhoto(userId, client.id, client.fotoUrl ?? "")
      setWorkspaceClientProfile(userId, client.id, client.perfilOperacional ?? createDefaultClientProfile())
    }
    setCachedWorkspaceClients(userId, nextClients)
    emitWorkspaceSync()
    return client
  }
  const response = await authFetch("/api/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: client.id || undefined,
      name: client.nome,
      phone: client.telefone,
      countryCode: client.codigoPais,
      editLevel: client.nivelEdicao,
      averageDuration: client.duracaoMedia,
      frequency: client.frequencia,
      driveLink: client.linkDrive,
      driveFolderId: client.driveFolderId?.trim() || null,
      driveFolderName: client.driveFolderName?.trim() || "",
    }),
  })
  const payload = await readJsonResponse<{ client: ClientRow }>(response)
  const savedClient = {
    ...mapClientRow(payload.client),
    fotoUrl: client.fotoUrl?.trim() ?? "",
    driveFolderId: payload.client.drive_folder_id ?? client.driveFolderId?.trim() ?? "",
    driveFolderName: payload.client.drive_folder_name ?? client.driveFolderName?.trim() ?? "",
    perfilOperacional: client.perfilOperacional ?? createDefaultClientProfile(),
  }
  setWorkspaceClientPhoto(userId, savedClient.id, savedClient.fotoUrl ?? "")
  setWorkspaceClientProfile(userId, savedClient.id, savedClient.perfilOperacional ?? createDefaultClientProfile())
  const nextClients = (() => {
    const currentClients = getCachedWorkspaceClients(userId) ?? []
    const exists = currentClients.some((item) => item.id === savedClient.id)
    return exists
      ? currentClients.map((item) => (item.id === savedClient.id ? savedClient : item))
      : [savedClient, ...currentClients]
  })()
  setCachedWorkspaceClients(userId, nextClients)
  emitWorkspaceSync()
  return savedClient
}

export const deleteWorkspaceClient = async (userId: string, clientId: string) => {
  if (!isSupabaseConfigured) {
    const nextClients = getWorkspaceClients().filter((client) => client.id !== clientId)
    saveWorkspaceClients(nextClients)
    removeWorkspaceClientPhoto(userId, clientId)
    removeWorkspaceClientProfile(userId, clientId)
    setCachedWorkspaceClients(userId, nextClients)
    emitWorkspaceSync()
    return
  }
  const response = await authFetch("/api/clients", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: clientId }),
  })
  await readJsonResponse<{ success: boolean }>(response)
  const cachedClients = getCachedWorkspaceClients(userId)
  if (cachedClients) {
    setCachedWorkspaceClients(userId, cachedClients.filter((client) => client.id !== clientId))
  }
  removeWorkspaceClientPhoto(userId, clientId)
  removeWorkspaceClientProfile(userId, clientId)
  emitWorkspaceSync()
}

export const fetchWorkspaceTasks = async (userId: string, options?: { force?: boolean }) => {
  const cachedTasks = getCachedWorkspaceTasks(userId)
  if (!options?.force && cachedTasks) return cachedTasks

  const pendingRequest = pendingWorkspaceTasksRequests.get(userId)
  if (pendingRequest) return pendingRequest

  if (!isSupabaseConfigured) {
    const tasks = getWorkspaceTasks()
    setCachedWorkspaceTasks(userId, tasks)
    return tasks
  }

  const request = (async () => {
    try {
      const response = await authFetch("/api/tasks")
      const payload = await readJsonResponse<{ tasks: TaskRow[] }>(response)
      const tasks = (payload.tasks ?? []).map((row) => {
        const taskMeta = getWorkspaceTaskMeta(userId, row.id)
        return {
          ...mapTaskRow(row),
          checklist: taskMeta?.checklist ?? createDefaultTaskChecklist(),
          escopo: taskMeta?.escopo ?? createDefaultTaskScope(),
          timeline: taskMeta?.timeline ?? [],
        }
      })
      setCachedWorkspaceTasks(userId, tasks)
      return tasks
    } finally {
      pendingWorkspaceTasksRequests.delete(userId)
    }
  })()

  pendingWorkspaceTasksRequests.set(userId, request)
  return request
}

export const createWorkspaceTask = async (
  userId: string,
  task: Pick<WorkspaceTask, "titulo" | "descricao" | "clienteId" | "clienteNome" | "prazo" | "checklist" | "escopo">
) => {
  if (!isSupabaseConfigured) {
    const currentTasks = getWorkspaceTasks()
    const createdAt = new Date().toISOString()
    const nextTask: WorkspaceTask = {
      id: crypto.randomUUID(),
      titulo: task.titulo,
      descricao: task.descricao,
      clienteId: task.clienteId,
      clienteNome: task.clienteNome,
      prazo: task.prazo,
      colunaId: "agenda",
      statusCliente: "pendente",
      updatedAt: createdAt,
      notificationRead: true,
      checklist: task.checklist ?? createDefaultTaskChecklist(),
      escopo: task.escopo ?? createDefaultTaskScope(),
      timeline: [createTimelineEvent("created", "Tarefa criada", "Projeto adicionado à agenda.", createdAt)],
    }
    saveWorkspaceTasks([nextTask, ...currentTasks])
    setWorkspaceTaskMeta(userId, nextTask.id, {
      checklist: nextTask.checklist ?? createDefaultTaskChecklist(),
      escopo: nextTask.escopo ?? createDefaultTaskScope(),
      timeline: nextTask.timeline ?? [],
    })
    setCachedWorkspaceTasks(userId, [nextTask, ...currentTasks])
    emitWorkspaceSync()
    return nextTask
  }
  const response = await authFetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      title: task.titulo,
      description: task.descricao,
      client_id: task.clienteId,
      client_name: task.clienteNome,
      due_date: task.prazo,
      column_id: "agenda",
      client_status: "pendente",
      notification_read: true,
    }),
  })
  const payload = await readJsonResponse<{ task: TaskRow }>(response)
  const createdTask = {
    ...mapTaskRow(payload.task),
    checklist: task.checklist ?? createDefaultTaskChecklist(),
    escopo: task.escopo ?? createDefaultTaskScope(),
    timeline: [createTimelineEvent("created", "Tarefa criada", "Projeto adicionado à agenda.", payload.task.updated_at)],
  }
  setWorkspaceTaskMeta(userId, createdTask.id, {
    checklist: createdTask.checklist ?? createDefaultTaskChecklist(),
    escopo: createdTask.escopo ?? createDefaultTaskScope(),
    timeline: createdTask.timeline ?? [],
  })
  const cachedTasks = getCachedWorkspaceTasks(userId) ?? []
  setCachedWorkspaceTasks(userId, [createdTask, ...cachedTasks.filter((task) => task.id !== createdTask.id)])
  emitWorkspaceSync()
  return createdTask
}

export const updateWorkspaceTask = async (userId: string, taskId: string, changes: Partial<WorkspaceTask>) => {
  const currentTask =
    (getCachedWorkspaceTasks(userId) ?? getWorkspaceTasks()).find((task) => task.id === taskId) ?? null
  const currentMeta = getWorkspaceTaskMeta(userId, taskId) ?? {
    checklist: currentTask?.checklist ?? createDefaultTaskChecklist(),
    escopo: currentTask?.escopo ?? createDefaultTaskScope(),
    timeline: currentTask?.timeline ?? [],
  }
  const nextChecklist = changes.checklist ?? currentMeta.checklist
  const nextEscopo = changes.escopo ?? currentMeta.escopo
  const nextTimeline = [...currentMeta.timeline]
  const changeMoment = new Date().toISOString()

  if (changes.checklist) {
    nextTimeline.unshift(createTimelineEvent("kickoff-updated", "Kickoff atualizado", "Checklist de preparação revisado.", changeMoment))
  }
  if (changes.escopo) {
    nextTimeline.unshift(createTimelineEvent("scope-updated", "Escopo atualizado", "Escopo combinado foi ajustado.", changeMoment))
  }
  if (changes.colunaId && changes.colunaId !== currentTask?.colunaId) {
    nextTimeline.unshift(createTimelineEvent("moved", "Etapa alterada", `Tarefa movida para ${changes.colunaId}.`, changeMoment))
  }
  if (changes.linkAprovacao && changes.linkAprovacao !== currentTask?.linkAprovacao) {
    nextTimeline.unshift(createTimelineEvent("approval-generated", "Link de aprovação gerado", "Entrega enviada para revisão do cliente.", changeMoment))
  }
  if (changes.statusCliente === "concluido" && currentTask?.statusCliente !== "concluido") {
    nextTimeline.unshift(createTimelineEvent("client-approved", "Cliente aprovou", "O cliente aprovou a entrega.", changeMoment))
    nextTimeline.unshift(createTimelineEvent("completed", "Projeto concluído", "Entrega finalizada sem pendências.", changeMoment))
  }
  if (changes.statusCliente === "desaprovado" && currentTask?.statusCliente !== "desaprovado") {
    nextTimeline.unshift(createTimelineEvent("client-revision", "Cliente desaprovou", "A entrega voltou como desaprovada para ajustes.", changeMoment))
  }

  if (!isSupabaseConfigured) {
    const nextTasks = getWorkspaceTasks().map((task) =>
      task.id === taskId
        ? {
            ...task,
            ...changes,
            checklist: nextChecklist,
            escopo: nextEscopo,
            timeline: nextTimeline,
            updatedAt: changeMoment,
          }
        : task
    )
    saveWorkspaceTasks(nextTasks)
    setWorkspaceTaskMeta(userId, taskId, { checklist: nextChecklist, escopo: nextEscopo, timeline: nextTimeline })
    setCachedWorkspaceTasks(userId, nextTasks)
    emitWorkspaceSync()
    return nextTasks.find((task) => task.id === taskId) ?? null
  }
  const payload = {
    title: changes.titulo,
    description: changes.descricao,
    client_id: changes.clienteId,
    client_name: changes.clienteNome,
    due_date: changes.prazo,
    column_id: changes.colunaId,
    drive_link: changes.linkDrive,
    approval_link: changes.linkAprovacao,
    approved: changes.aprovado,
    client_feedback: changes.feedbackCliente,
    client_status: changes.statusCliente,
    notification_read:
      typeof changes.notificationRead === "boolean"
        ? changes.notificationRead
        : changes.statusCliente && changes.statusCliente !== "pendente"
          ? false
          : undefined,
  }

  const cleanedPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
  if (Object.keys(cleanedPayload).length === 0) {
    const fallbackTask = {
      ...(currentTask ?? mapTaskRow({
        id: taskId,
        title: "",
        description: "",
        client_id: "",
        client_name: "",
        due_date: new Date().toISOString(),
        column_id: "agenda",
        drive_link: "",
        approval_link: "",
        approved: null,
        client_feedback: "",
        client_status: "pendente",
        notification_read: true,
        updated_at: changeMoment,
      })),
      ...changes,
      checklist: nextChecklist,
      escopo: nextEscopo,
      timeline: nextTimeline,
      updatedAt: changeMoment,
    }
    setWorkspaceTaskMeta(userId, taskId, { checklist: nextChecklist, escopo: nextEscopo, timeline: nextTimeline })
    const cachedTasks = getCachedWorkspaceTasks(userId) ?? []
    setCachedWorkspaceTasks(
      userId,
      cachedTasks.map((task) => (task.id === taskId ? fallbackTask : task))
    )
    emitWorkspaceSync()
    return fallbackTask
  }

  const response = await authFetch("/api/tasks", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: taskId,
      changes: cleanedPayload,
    }),
  })
  const result = await readJsonResponse<{ task: TaskRow }>(response)
  const updatedTask = {
    ...mapTaskRow(result.task),
    checklist: nextChecklist,
    escopo: nextEscopo,
    timeline: nextTimeline,
  }
  setWorkspaceTaskMeta(userId, taskId, { checklist: nextChecklist, escopo: nextEscopo, timeline: nextTimeline })
  const cachedTasks = getCachedWorkspaceTasks(userId) ?? []
  setCachedWorkspaceTasks(
    userId,
    cachedTasks.map((task) => (task.id === taskId ? updatedTask : task))
  )
  emitWorkspaceSync()
  return updatedTask
}

export const deleteWorkspaceTask = async (userId: string, taskId: string) => {
  if (!isSupabaseConfigured) {
    const nextTasks = getWorkspaceTasks().filter((task) => task.id !== taskId)
    saveWorkspaceTasks(nextTasks)
    removeWorkspaceTaskMeta(userId, taskId)
    setCachedWorkspaceTasks(userId, nextTasks)
    emitWorkspaceSync()
    return
  }

  const response = await authFetch("/api/tasks", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: taskId }),
  })

  await readJsonResponse<{ success: boolean }>(response)
  const cachedTasks = getCachedWorkspaceTasks(userId)
  if (cachedTasks) {
    setCachedWorkspaceTasks(userId, cachedTasks.filter((task) => task.id !== taskId))
  }
  removeWorkspaceTaskMeta(userId, taskId)
  emitWorkspaceSync()
}

export const fetchUnreadNotificationCount = async (userId: string) => {
  const cachedTasks = getCachedWorkspaceTasks(userId)
  if (cachedTasks) {
    return cachedTasks.filter(
      (task) => task.statusCliente && task.statusCliente !== "pendente" && !task.notificationRead
    ).length
  }

  if (!isSupabaseConfigured) {
    return getWorkspaceTasks().filter(
      (task) => task.statusCliente && task.statusCliente !== "pendente" && !task.notificationRead
    ).length
  }
  try {
    const tasks = await fetchWorkspaceTasks(userId)
    return tasks.filter(
      (task) => task.statusCliente && task.statusCliente !== "pendente" && !task.notificationRead
    ).length
  } catch (error) {
    console.error(error)
    return 0
  }
}

export const markNotificationsAsRead = async (userId: string) => {
  const cachedTasks = getCachedWorkspaceTasks(userId)
  const unreadCachedTasks = cachedTasks?.filter(
    (task) => task.statusCliente && task.statusCliente !== "pendente" && !task.notificationRead
  ) ?? []

  if (cachedTasks && unreadCachedTasks.length === 0) {
    return
  }

  if (!isSupabaseConfigured) {
    const nextTasks = getWorkspaceTasks().map((task) =>
      task.statusCliente && task.statusCliente !== "pendente"
        ? { ...task, notificationRead: true, updatedAt: task.updatedAt ?? new Date().toISOString() }
        : task
    )
    saveWorkspaceTasks(nextTasks)
    setCachedWorkspaceTasks(userId, nextTasks)
    emitWorkspaceSync()
    return
  }
  try {
    const tasks = cachedTasks ?? (await fetchWorkspaceTasks(userId))
    const pendingWrites = tasks
      .filter((task) => task.statusCliente && task.statusCliente !== "pendente" && !task.notificationRead)
      .map((task) =>
        updateWorkspaceTask(userId, task.id, {
          notificationRead: true,
        })
      )

    await Promise.all(pendingWrites)
    const refreshedCachedTasks = getCachedWorkspaceTasks(userId)
    if (refreshedCachedTasks) {
      setCachedWorkspaceTasks(
        userId,
        refreshedCachedTasks.map((task) =>
          task.statusCliente && task.statusCliente !== "pendente"
            ? { ...task, notificationRead: true }
            : task
        )
      )
    }
    emitWorkspaceSync()
  } catch (error) {
    console.error(error)
  }
}

export const fetchFinanceTransactions = async (userId: string) => {
  const cachedTransactions = getCachedFinanceTransactions(userId)
  if (cachedTransactions) return cachedTransactions

  const pendingRequest = pendingFinanceTransactionsRequests.get(userId)
  if (pendingRequest) return pendingRequest

  if (!isSupabaseConfigured) {
    const items = readLocalStorage<FinanceTransaction[]>(FINANCE_TRANSACTIONS_KEY, [])
    setCachedFinanceTransactions(userId, items)
    return items
  }
  const request = (async () => {
    try {
      const response = await authFetch("/api/finance?type=transactions")
      const payload = await readJsonResponse<{ items: FinanceTransactionRow[] }>(response)
      const items = (payload.items ?? []).map((row) => mapTransactionRow(row))
      setCachedFinanceTransactions(userId, items)
      return items
    } finally {
      pendingFinanceTransactionsRequests.delete(userId)
    }
  })()

  pendingFinanceTransactionsRequests.set(userId, request)
  return request
}

export const createFinanceTransaction = async (userId: string, transaction: Omit<FinanceTransaction, "id">) => {
  if (!isSupabaseConfigured) {
    const createdTransaction = { ...transaction, id: crypto.randomUUID() }
    const currentTransactions = readLocalStorage<FinanceTransaction[]>(FINANCE_TRANSACTIONS_KEY, [])
    const nextTransactions = [createdTransaction, ...currentTransactions]
    writeLocalStorage(FINANCE_TRANSACTIONS_KEY, nextTransactions)
    setCachedFinanceTransactions(userId, nextTransactions)
    emitWorkspaceSync()
    return createdTransaction
  }
  const response = await authFetch("/api/finance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "transaction",
      kind: transaction.tipo,
      amount: transaction.valor,
      description: transaction.descricao,
      category: transaction.categoria,
      clientName: transaction.cliente || null,
      transactionDate: transaction.data,
    }),
  })
  const payload = await readJsonResponse<{ item: FinanceTransactionRow }>(response)
  const createdTransaction = mapTransactionRow(payload.item)
  const cachedTransactions = getCachedFinanceTransactions(userId) ?? []
  setCachedFinanceTransactions(
    userId,
    [createdTransaction, ...cachedTransactions.filter((item) => item.id !== createdTransaction.id)]
  )
  emitWorkspaceSync()
  return createdTransaction
}

export const deleteFinanceTransaction = async (userId: string, transactionId: string) => {
  if (!isSupabaseConfigured) {
    const nextTransactions = readLocalStorage<FinanceTransaction[]>(FINANCE_TRANSACTIONS_KEY, []).filter(
      (item) => item.id !== transactionId
    )
    writeLocalStorage(FINANCE_TRANSACTIONS_KEY, nextTransactions)
    setCachedFinanceTransactions(userId, nextTransactions)
    emitWorkspaceSync()
    return
  }
  const response = await authFetch("/api/finance", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: transactionId,
      type: "transaction",
    }),
  })
  await readJsonResponse<{ success: boolean }>(response)
  const cachedTransactions = getCachedFinanceTransactions(userId)
  if (cachedTransactions) {
    setCachedFinanceTransactions(
      userId,
      cachedTransactions.filter((item) => item.id !== transactionId)
    )
  }
  emitWorkspaceSync()
}

export const fetchFixedExpenses = async (userId: string) => {
  const cachedExpenses = getCachedFixedExpenses(userId)
  if (cachedExpenses) return cachedExpenses

  const pendingRequest = pendingFixedExpensesRequests.get(userId)
  if (pendingRequest) return pendingRequest

  if (!isSupabaseConfigured) {
    const items = readLocalStorage<FixedExpense[]>(FIXED_EXPENSES_KEY, [])
    setCachedFixedExpenses(userId, items)
    return items
  }
  const request = (async () => {
    try {
      const response = await authFetch("/api/finance?type=expenses")
      const payload = await readJsonResponse<{ items: FixedExpenseRow[] }>(response)
      const items = (payload.items ?? []).map((row) => mapFixedExpenseRow(row))
      setCachedFixedExpenses(userId, items)
      return items
    } finally {
      pendingFixedExpensesRequests.delete(userId)
    }
  })()

  pendingFixedExpensesRequests.set(userId, request)
  return request
}

export const createFixedExpense = async (userId: string, expense: Omit<FixedExpense, "id">) => {
  if (!isSupabaseConfigured) {
    const createdExpense = { ...expense, id: crypto.randomUUID() }
    const currentExpenses = readLocalStorage<FixedExpense[]>(FIXED_EXPENSES_KEY, [])
    const nextExpenses = [createdExpense, ...currentExpenses]
    writeLocalStorage(FIXED_EXPENSES_KEY, nextExpenses)
    setCachedFixedExpenses(userId, nextExpenses)
    emitWorkspaceSync()
    return createdExpense
  }
  const response = await authFetch("/api/finance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "expense",
      name: expense.nome,
      amount: expense.valor,
      category: expense.categoria,
    }),
  })
  const payload = await readJsonResponse<{ item: FixedExpenseRow }>(response)
  const createdExpense = mapFixedExpenseRow(payload.item)
  const cachedExpenses = getCachedFixedExpenses(userId) ?? []
  setCachedFixedExpenses(
    userId,
    [createdExpense, ...cachedExpenses.filter((item) => item.id !== createdExpense.id)]
  )
  emitWorkspaceSync()
  return createdExpense
}

export const deleteFixedExpense = async (userId: string, expenseId: string) => {
  if (!isSupabaseConfigured) {
    const nextExpenses = readLocalStorage<FixedExpense[]>(FIXED_EXPENSES_KEY, []).filter((item) => item.id !== expenseId)
    writeLocalStorage(FIXED_EXPENSES_KEY, nextExpenses)
    setCachedFixedExpenses(userId, nextExpenses)
    emitWorkspaceSync()
    return
  }
  const response = await authFetch("/api/finance", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: expenseId,
      type: "expense",
    }),
  })
  await readJsonResponse<{ success: boolean }>(response)
  const cachedExpenses = getCachedFixedExpenses(userId)
  if (cachedExpenses) {
    setCachedFixedExpenses(
      userId,
      cachedExpenses.filter((item) => item.id !== expenseId)
    )
  }
  emitWorkspaceSync()
}
