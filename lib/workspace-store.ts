export interface WorkspaceClient {
  id: string
  nome: string
  telefone: string
  codigoPais: string
  nivelEdicao: "simples" | "medio" | "profissional"
  duracaoMedia: number
  frequencia: string
  linkDrive: string
  createdAt: string
}

export interface WorkspaceTask {
  id: string
  titulo: string
  descricao: string
  clienteId: string
  clienteNome: string
  prazo: string
  colunaId: string
  linkDrive?: string
  linkAprovacao?: string
  aprovado?: boolean | null
  feedbackCliente?: string
  statusCliente?: "pendente" | "concluido" | "refazendo"
  notificationRead?: boolean
  updatedAt?: string
}

const CLIENTS_KEY = "astherisch-clients"
const TASKS_KEY = "astherisch-tasks"
const STORAGE_EVENT = "astherisch-workspace-updated"

const isBrowser = () => typeof window !== "undefined"

const readStorage = <T,>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback

  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

const writeStorage = <T,>(key: string, value: T) => {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: key }))
}

export const getWorkspaceClients = () => readStorage<WorkspaceClient[]>(CLIENTS_KEY, [])
export const saveWorkspaceClients = (clients: WorkspaceClient[]) => writeStorage(CLIENTS_KEY, clients)

export const getWorkspaceTasks = () => readStorage<WorkspaceTask[]>(TASKS_KEY, [])
export const saveWorkspaceTasks = (tasks: WorkspaceTask[]) => writeStorage(TASKS_KEY, tasks)

export const subscribeWorkspace = (callback: () => void) => {
  if (!isBrowser()) return () => {}

  const handler = () => callback()
  window.addEventListener(STORAGE_EVENT, handler)
  window.addEventListener("storage", handler)

  return () => {
    window.removeEventListener(STORAGE_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}
