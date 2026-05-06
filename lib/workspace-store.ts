export interface WorkspaceClientProfile {
  tipoConteudo: string
  formatoPadrao: string
  prazoHabitual: string
  nivelExigencia: "baixo" | "medio" | "alto"
  revisoesMedias: number
  observacoes: string
}

export interface WorkspaceTaskChecklist {
  briefingRecebido: boolean
  arquivosRecebidos: boolean
  referenciaAprovada: boolean
  formatoDefinido: boolean
  prazoConfirmado: boolean
  pagamentoAlinhado: boolean
}

export interface WorkspaceTaskScope {
  quantidadeVideos: string
  duracaoEsperada: string
  formatos: string
  revisoesIncluidas: string
  valorCombinado: string
  extrasCombinados: string
  prazoPrometido: string
}

export interface WorkspaceTimelineEvent {
  id: string
  type:
    | "created"
    | "kickoff-updated"
    | "scope-updated"
    | "moved"
    | "approval-generated"
    | "client-approved"
    | "client-revision"
    | "completed"
    | "quote-converted"
  title: string
  description: string
  createdAt: string
}

export interface WorkspaceClient {
  id: string
  nome: string
  fotoUrl?: string
  telefone: string
  codigoPais: string
  nivelEdicao: "simples" | "medio" | "profissional"
  duracaoMedia: number
  frequencia: string
  linkDrive: string
  driveFolderId?: string
  driveFolderName?: string
  createdAt: string
  perfilOperacional?: WorkspaceClientProfile
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
  statusCliente?: "pendente" | "concluido" | "desaprovado"
  notificationRead?: boolean
  updatedAt?: string
  checklist?: WorkspaceTaskChecklist
  escopo?: WorkspaceTaskScope
  timeline?: WorkspaceTimelineEvent[]
}

const CLIENTS_KEY = "astherisch-clients"
const TASKS_KEY = "astherisch-tasks"
const STORAGE_EVENT = "astherisch-workspace-updated"
const CLIENT_PHOTOS_KEY = "editup-client-photos"
const CLIENT_META_KEY = "editup-client-metadata"
const TASK_META_KEY = "editup-task-metadata"

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

type ClientPhotosMap = Record<string, string>
type ClientMetaMap = Record<string, WorkspaceClientProfile>
type TaskMetaMap = Record<string, { checklist: WorkspaceTaskChecklist; escopo: WorkspaceTaskScope; timeline: WorkspaceTimelineEvent[] }>

export const getWorkspaceClientPhotos = () => readStorage<ClientPhotosMap>(CLIENT_PHOTOS_KEY, {})
export const getWorkspaceClientMetadata = () => readStorage<ClientMetaMap>(CLIENT_META_KEY, {})
export const getWorkspaceTaskMetadata = () => readStorage<TaskMetaMap>(TASK_META_KEY, {})

export const getWorkspaceClientPhoto = (userId: string, clientId: string) => {
  const photos = getWorkspaceClientPhotos()
  return photos[`${userId}:${clientId}`] ?? ""
}

export const setWorkspaceClientPhoto = (userId: string, clientId: string, fotoUrl: string) => {
  const photos = getWorkspaceClientPhotos()
  const key = `${userId}:${clientId}`
  const normalizedPhoto = fotoUrl.trim()

  if (!normalizedPhoto) {
    delete photos[key]
  } else {
    photos[key] = normalizedPhoto
  }

  writeStorage(CLIENT_PHOTOS_KEY, photos)
}

export const removeWorkspaceClientPhoto = (userId: string, clientId: string) => {
  const photos = getWorkspaceClientPhotos()
  delete photos[`${userId}:${clientId}`]
  writeStorage(CLIENT_PHOTOS_KEY, photos)
}

export const getWorkspaceClientProfile = (userId: string, clientId: string): WorkspaceClientProfile | null => {
  const metadata = getWorkspaceClientMetadata()
  return metadata[`${userId}:${clientId}`] ?? null
}

export const setWorkspaceClientProfile = (userId: string, clientId: string, profile: WorkspaceClientProfile) => {
  const metadata = getWorkspaceClientMetadata()
  metadata[`${userId}:${clientId}`] = profile
  writeStorage(CLIENT_META_KEY, metadata)
}

export const removeWorkspaceClientProfile = (userId: string, clientId: string) => {
  const metadata = getWorkspaceClientMetadata()
  delete metadata[`${userId}:${clientId}`]
  writeStorage(CLIENT_META_KEY, metadata)
}

export const getWorkspaceTaskMeta = (userId: string, taskId: string) => {
  const metadata = getWorkspaceTaskMetadata()
  return metadata[`${userId}:${taskId}`] ?? null
}

export const setWorkspaceTaskMeta = (
  userId: string,
  taskId: string,
  meta: { checklist: WorkspaceTaskChecklist; escopo: WorkspaceTaskScope; timeline: WorkspaceTimelineEvent[] }
) => {
  const metadata = getWorkspaceTaskMetadata()
  metadata[`${userId}:${taskId}`] = meta
  writeStorage(TASK_META_KEY, metadata)
}

export const removeWorkspaceTaskMeta = (userId: string, taskId: string) => {
  const metadata = getWorkspaceTaskMetadata()
  delete metadata[`${userId}:${taskId}`]
  writeStorage(TASK_META_KEY, metadata)
}

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
