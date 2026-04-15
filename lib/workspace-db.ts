"use client"

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase"
import {
  getWorkspaceClients,
  getWorkspaceTasks,
  saveWorkspaceClients,
  saveWorkspaceTasks,
  WorkspaceClient,
  WorkspaceTask,
} from "@/lib/workspace-store"

const WORKSPACE_SYNC_EVENT = "astherisch-workspace-sync"

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

const emitWorkspaceSync = () => {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(WORKSPACE_SYNC_EVENT))
}

export const subscribeWorkspaceSync = (callback: () => void) => {
  if (!isBrowser()) return () => {}

  window.addEventListener(WORKSPACE_SYNC_EVENT, callback)
  window.addEventListener("focus", callback)

  return () => {
    window.removeEventListener(WORKSPACE_SYNC_EVENT, callback)
    window.removeEventListener("focus", callback)
  }
}

const mapClientRow = (row: ClientRow): WorkspaceClient => ({
  id: row.id,
  nome: row.name,
  telefone: row.phone ?? "",
  codigoPais: row.country_code ?? "+55",
  nivelEdicao: row.edit_level ?? "simples",
  duracaoMedia: row.average_duration ?? 15,
  frequencia: row.frequency ?? "",
  linkDrive: row.drive_link ?? "",
  createdAt: row.created_at,
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

const resolveAuthenticatedUserId = async (fallbackUserId?: string) => {
  if (!isSupabaseConfigured) return fallbackUserId ?? ""

  const {
    data: { user },
    error,
  } = await getSupabaseClient().auth.getUser()

  if (error) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.")
  }

  const resolvedUserId = user?.id ?? fallbackUserId

  if (!resolvedUserId) {
    throw new Error("Nenhuma sessão ativa encontrada. Faça login novamente.")
  }

  return resolvedUserId
}

export const fetchWorkspaceClients = async (userId: string) => {
  if (!isSupabaseConfigured) return getWorkspaceClients()
  const response = await fetch(`/api/clients?userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
  })
  const payload = (await response.json()) as { error?: string; clients?: Array<Record<string, unknown>> }
  if (!response.ok || !payload.clients) {
    throw new Error(payload.error ?? "Não foi possível carregar os clientes.")
  }
  return payload.clients.map((row) => mapClientRow(row as unknown as ClientRow))
}

export const upsertWorkspaceClient = async (userId: string, client: WorkspaceClient) => {
  if (!isSupabaseConfigured) {
    const currentClients = getWorkspaceClients()
    const exists = currentClients.some((item) => item.id === client.id)
    const nextClients = exists ? currentClients.map((item) => (item.id === client.id ? client : item)) : [client, ...currentClients]
    saveWorkspaceClients(nextClients)
    emitWorkspaceSync()
    return client
  }
  const response = await fetch("/api/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: client.id || undefined,
      userId,
      name: client.nome,
      phone: client.telefone,
      countryCode: client.codigoPais,
      editLevel: client.nivelEdicao,
      averageDuration: client.duracaoMedia,
      frequency: client.frequencia,
      driveLink: client.linkDrive,
    }),
  })
  const payload = (await response.json()) as { error?: string; client?: Record<string, unknown> }
  if (!response.ok || !payload.client) throw new Error(payload.error ?? "Não foi possível salvar o cliente.")
  emitWorkspaceSync()
  return mapClientRow(payload.client as unknown as ClientRow)
}

export const deleteWorkspaceClient = async (userId: string, clientId: string) => {
  if (!isSupabaseConfigured) {
    saveWorkspaceClients(getWorkspaceClients().filter((client) => client.id !== clientId))
    emitWorkspaceSync()
    return
  }
  const response = await fetch("/api/clients", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: clientId, userId }),
  })
  const payload = (await response.json()) as { error?: string }
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível remover o cliente.")
  emitWorkspaceSync()
}

export const fetchWorkspaceTasks = async (userId: string) => {
  if (!isSupabaseConfigured) return getWorkspaceTasks()
  const response = await fetch(`/api/tasks?userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
  })
  const payload = (await response.json()) as { error?: string; tasks?: Array<Record<string, unknown>> }

  if (!response.ok || !payload.tasks) {
    throw new Error(payload.error ?? "Não foi possível carregar a agenda.")
  }

  return payload.tasks.map((row) => mapTaskRow(row as unknown as TaskRow))
}

export const createWorkspaceTask = async (
  userId: string,
  task: Pick<WorkspaceTask, "titulo" | "descricao" | "clienteId" | "clienteNome" | "prazo">
) => {
  if (!isSupabaseConfigured) {
    const currentTasks = getWorkspaceTasks()
    const nextTask: WorkspaceTask = {
      id: crypto.randomUUID(),
      titulo: task.titulo,
      descricao: task.descricao,
      clienteId: task.clienteId,
      clienteNome: task.clienteNome,
      prazo: task.prazo,
      colunaId: "agenda",
      statusCliente: "pendente",
      updatedAt: new Date().toISOString(),
      notificationRead: true,
    }
    saveWorkspaceTasks([nextTask, ...currentTasks])
    emitWorkspaceSync()
    return nextTask
  }
  const response = await fetch("/api/tasks", {
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
  const payload = (await response.json()) as { error?: string; task?: Record<string, unknown> }
  if (!response.ok || !payload.task) throw new Error(payload.error ?? "Não foi possível criar a tarefa.")
  emitWorkspaceSync()
  return mapTaskRow(payload.task as unknown as TaskRow)
}

export const updateWorkspaceTask = async (userId: string, taskId: string, changes: Partial<WorkspaceTask>) => {
  if (!isSupabaseConfigured) {
    const nextTasks = getWorkspaceTasks().map((task) =>
      task.id === taskId ? { ...task, ...changes, updatedAt: new Date().toISOString() } : task
    )
    saveWorkspaceTasks(nextTasks)
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
  const response = await fetch("/api/tasks", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: taskId,
      userId,
      changes: cleanedPayload,
    }),
  })
  const responsePayload = (await response.json()) as { error?: string; task?: Record<string, unknown> }

  if (!response.ok || !responsePayload.task) {
    throw new Error(responsePayload.error ?? "Não foi possível atualizar a tarefa.")
  }
  emitWorkspaceSync()
  return mapTaskRow(responsePayload.task as unknown as TaskRow)
}

export const fetchUnreadNotificationCount = async (userId: string) => {
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
  if (!isSupabaseConfigured) {
    const nextTasks = getWorkspaceTasks().map((task) =>
      task.statusCliente && task.statusCliente !== "pendente"
        ? { ...task, notificationRead: true, updatedAt: task.updatedAt ?? new Date().toISOString() }
        : task
    )
    saveWorkspaceTasks(nextTasks)
    emitWorkspaceSync()
    return
  }
  try {
    const tasks = await fetchWorkspaceTasks(userId)
    const pendingWrites = tasks
      .filter((task) => task.statusCliente && task.statusCliente !== "pendente" && !task.notificationRead)
      .map((task) =>
        updateWorkspaceTask(userId, task.id, {
          notificationRead: true,
        })
      )

    await Promise.all(pendingWrites)
    emitWorkspaceSync()
  } catch (error) {
    console.error(error)
  }
}

export const fetchFinanceTransactions = async (userId: string) => {
  if (!isSupabaseConfigured) return [] as FinanceTransaction[]
  const response = await fetch(`/api/finance?type=transactions&userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
  })
  const payload = (await response.json()) as { error?: string; items?: Array<Record<string, unknown>> }
  if (!response.ok || !payload.items) throw new Error(payload.error ?? "Não foi possível carregar as transações.")
  return payload.items.map((row) => mapTransactionRow(row as unknown as FinanceTransactionRow))
}

export const createFinanceTransaction = async (userId: string, transaction: Omit<FinanceTransaction, "id">) => {
  if (!isSupabaseConfigured) return { ...transaction, id: crypto.randomUUID() }
  const response = await fetch("/api/finance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "transaction",
      userId,
      kind: transaction.tipo,
      amount: transaction.valor,
      description: transaction.descricao,
      category: transaction.categoria,
      clientName: transaction.cliente || null,
      transactionDate: transaction.data,
    }),
  })
  const payload = (await response.json()) as { error?: string; item?: Record<string, unknown> }
  if (!response.ok || !payload.item) throw new Error(payload.error ?? "Não foi possível salvar a transação.")
  return mapTransactionRow(payload.item as unknown as FinanceTransactionRow)
}

export const deleteFinanceTransaction = async (userId: string, transactionId: string) => {
  if (!isSupabaseConfigured) return
  const response = await fetch("/api/finance", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "transaction", id: transactionId, userId }),
  })
  const payload = (await response.json()) as { error?: string }
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível remover a transação.")
}

export const fetchFixedExpenses = async (userId: string) => {
  if (!isSupabaseConfigured) return [] as FixedExpense[]
  const response = await fetch(`/api/finance?type=expenses&userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
  })
  const payload = (await response.json()) as { error?: string; items?: Array<Record<string, unknown>> }
  if (!response.ok || !payload.items) throw new Error(payload.error ?? "Não foi possível carregar os gastos fixos.")
  return payload.items.map((row) => mapFixedExpenseRow(row as unknown as FixedExpenseRow))
}

export const createFixedExpense = async (userId: string, expense: Omit<FixedExpense, "id">) => {
  if (!isSupabaseConfigured) return { ...expense, id: crypto.randomUUID() }
  const response = await fetch("/api/finance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "expense",
      userId,
      name: expense.nome,
      amount: expense.valor,
      category: expense.categoria,
    }),
  })
  const payload = (await response.json()) as { error?: string; item?: Record<string, unknown> }
  if (!response.ok || !payload.item) throw new Error(payload.error ?? "Não foi possível salvar o gasto fixo.")
  return mapFixedExpenseRow(payload.item as unknown as FixedExpenseRow)
}

export const deleteFixedExpense = async (userId: string, expenseId: string) => {
  if (!isSupabaseConfigured) return
  const response = await fetch("/api/finance", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "expense", id: expenseId, userId }),
  })
  const payload = (await response.json()) as { error?: string }
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível remover o gasto fixo.")
}
