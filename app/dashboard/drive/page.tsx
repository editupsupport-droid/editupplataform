"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, FolderOpen, Link2, Loader2, RefreshCcw, Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { DriveUploadDropzone } from "@/components/google-drive/drive-upload-dropzone"
import { DrivePickerButton } from "@/components/google-drive/drive-picker-button"
import { useAppSession } from "@/components/app/app-provider"
import { authFetch } from "@/lib/supabase"
import {
  fetchWorkspaceClients,
  fetchWorkspaceTasks,
  getCachedWorkspaceClients,
  getCachedWorkspaceTasks,
  subscribeWorkspaceSync,
} from "@/lib/workspace-db"
import type { WorkspaceTask } from "@/lib/workspace-store"
import { copyTextToClipboard } from "@/lib/clipboard"

type DriveStatus = {
  connected: boolean
  driveEmail?: string
}

type DriveFile = {
  id: string
  name: string
  mimeType: string
  size: number | null
  modifiedTime: string | null
  webViewLink: string
  webContentLink: string
  thumbnailLink: string
  parents?: string[]
}

type ClientFolder = {
  id: string
  nome: string
  driveFolderId?: string
  driveFolderName?: string
}

type DriveSessionSnapshot = {
  folderId: string
  breadcrumbs: Array<{ id: string; name: string }>
  files: DriveFile[]
  searchTerm: string
  fileView: "all" | "video" | "folder"
  loaded: boolean
}

let driveSessionSnapshot: DriveSessionSnapshot | null = null

const formatBytes = (value: number | null) => {
  if (!value) return "Tamanho não informado"
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const videoExtensions = [
  ".mp4",
  ".mov",
  ".mkv",
  ".avi",
  ".wmv",
  ".flv",
  ".webm",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".m4v",
  ".ts",
  ".vob",
  ".ogv",
]

const isDriveFolder = (file: Pick<DriveFile, "mimeType">) => file.mimeType === "application/vnd.google-apps.folder"

const isApprovalVideo = (file: Pick<DriveFile, "mimeType" | "name">) => {
  const normalizedName = file.name.toLowerCase()
  return file.mimeType.includes("video/") || videoExtensions.some((extension) => normalizedName.endsWith(extension))
}

export default function DrivePage() {
  const { currentUser } = useAppSession()
  const [status, setStatus] = useState<DriveStatus>({ connected: false })
  const [clientes, setClientes] = useState<ClientFolder[]>([])
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState("")
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([{ id: "", name: "Meu Drive" }])
  const [files, setFiles] = useState<DriveFile[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [fileView, setFileView] = useState<"all" | "video" | "folder">("all")
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [hasLoadedFiles, setHasLoadedFiles] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackError, setFeedbackError] = useState("")
  const [generatingApprovalFileId, setGeneratingApprovalFileId] = useState("")

  const linkedClients = useMemo(
    () => clientes.filter((cliente) => cliente.driveFolderId),
    [clientes]
  )
  const approvalTasks = useMemo(() => tasks.filter((task) => task.colunaId !== "concluido"), [tasks])
  const visibleFiles = useMemo(
    () =>
      [...files].sort((a, b) => {
        const aIsFolder = isDriveFolder(a)
        const bIsFolder = isDriveFolder(b)
        if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
        return a.name.localeCompare(b.name, "pt-BR")
      }),
    [files]
  )
  const currentFolderId = selectedFolderId || "root"

  const openFolder = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId)
    let nextBreadcrumbs: Array<{ id: string; name: string }> = []
    setBreadcrumbs((current) => {
      const existingIndex = current.findIndex((item) => item.id === folderId)
      nextBreadcrumbs = existingIndex >= 0 ? current.slice(0, existingIndex + 1) : [...current, { id: folderId, name: folderName }]
      return nextBreadcrumbs
    })
    void loadFiles(folderId, searchTerm, fileView, nextBreadcrumbs)
  }

  const goToBreadcrumb = (index: number) => {
    const nextBreadcrumbs = breadcrumbs.slice(0, index + 1)
    const target = nextBreadcrumbs[nextBreadcrumbs.length - 1]
    setBreadcrumbs(nextBreadcrumbs)
    setSelectedFolderId(target.id)
    void loadFiles(target.id, searchTerm, fileView, nextBreadcrumbs)
  }

  const loadDriveStatus = async () => {
    const response = await authFetch("/api/google-drive/status")
    const payload = (await response.json().catch(() => ({}))) as DriveStatus & { error?: string }

    if (!response.ok) {
      throw new Error(payload.error ?? "Não foi possível carregar o status do Google Drive.")
    }

    setStatus({ connected: Boolean(payload.connected), driveEmail: payload.driveEmail })
  }

  const loadClients = async (userId: string) => {
    const cachedClients = getCachedWorkspaceClients(userId)
    if (cachedClients) {
      setClientes(
        cachedClients.map((cliente) => ({
          id: cliente.id,
          nome: cliente.nome,
          driveFolderId: cliente.driveFolderId,
          driveFolderName: cliente.driveFolderName,
        }))
      )
    }

    const freshClients = await fetchWorkspaceClients(userId, { force: true })
    setClientes(
      freshClients.map((cliente) => ({
        id: cliente.id,
        nome: cliente.nome,
        driveFolderId: cliente.driveFolderId,
        driveFolderName: cliente.driveFolderName,
      }))
    )
  }

  const loadTasks = async (userId: string) => {
    const cachedTasks = getCachedWorkspaceTasks(userId)
    if (cachedTasks) {
      setTasks(cachedTasks)
    }

    const freshTasks = await fetchWorkspaceTasks(userId, { force: true })
    setTasks(freshTasks)
  }

  const loadFiles = async (
    folderId = "",
    currentSearch = searchTerm,
    currentView = fileView,
    currentBreadcrumbs = breadcrumbs
  ) => {
    setIsLoadingFiles(true)
    setHasLoadedFiles(true)
    try {
      const params = new URLSearchParams()
      if (folderId) {
        params.set("folderId", folderId)
      }
      if (currentSearch.trim()) {
        params.set("query", currentSearch.trim())
      }
      if (currentView !== "all") {
        params.set("mimeGroup", currentView)
      }

      const response = await authFetch(`/api/google-drive/files?${params.toString()}`)
      const payload = (await response.json().catch(() => ({}))) as { files?: DriveFile[]; error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível carregar os arquivos do Drive.")
      }

      const nextFiles = payload.files ?? []
      setFiles(nextFiles)
      driveSessionSnapshot = {
        folderId,
        breadcrumbs: currentBreadcrumbs,
        files: nextFiles,
        searchTerm: currentSearch,
        fileView: currentView,
        loaded: true,
      }
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar os arquivos do Drive.")
    } finally {
      setIsLoadingFiles(false)
    }
  }

  useEffect(() => {
    if (!currentUser) return

    void Promise.all([loadDriveStatus(), loadClients(currentUser.id), loadTasks(currentUser.id)]).catch((error) => {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar o Drive.")
    })

    return subscribeWorkspaceSync(() => {
      const cachedClients = getCachedWorkspaceClients(currentUser.id)
      if (cachedClients) {
        setClientes(
          cachedClients.map((cliente) => ({
            id: cliente.id,
            nome: cliente.nome,
            driveFolderId: cliente.driveFolderId,
            driveFolderName: cliente.driveFolderName,
          }))
        )
      }
      const cachedTasks = getCachedWorkspaceTasks(currentUser.id)
      if (cachedTasks) {
        setTasks(cachedTasks)
      }
    })
  }, [currentUser])

  useEffect(() => {
    if (!status.connected) return

    if (driveSessionSnapshot?.loaded) {
      setSelectedFolderId(driveSessionSnapshot.folderId)
      setBreadcrumbs(driveSessionSnapshot.breadcrumbs)
      setFiles(driveSessionSnapshot.files)
      setSearchTerm(driveSessionSnapshot.searchTerm)
      setFileView(driveSessionSnapshot.fileView)
      setHasLoadedFiles(true)
      return
    }

    void loadFiles(selectedFolderId, searchTerm, fileView)
  }, [status.connected])

  const connectDrive = async () => {
    try {
      setFeedbackError("")
      const response = await authFetch("/api/google-drive/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "/dashboard/drive" }),
      })
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Não foi possível iniciar a conexão com o Google Drive.")
      }

      window.location.href = payload.url
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível iniciar a conexão com o Google Drive.")
    }
  }

  const handleGenerateApprovalLink = async (file: DriveFile) => {
    if (!selectedTaskId) {
      setFeedbackError("Selecione uma entrega antes de gerar o link de aprovação.")
      return
    }

    try {
      setGeneratingApprovalFileId(file.id)
      setFeedbackMessage("")
      setFeedbackError("")
      const response = await authFetch("/api/approval-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTaskId,
          googleDriveFileId: file.id,
          googleDriveFileName: file.name,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { approvalLink?: string; error?: string }

      if (!response.ok || !payload.approvalLink) {
        throw new Error(payload.error ?? "Não foi possível gerar o link de aprovação.")
      }

      const didCopy = await copyTextToClipboard(payload.approvalLink)
      setFeedbackMessage(didCopy ? "Link de aprovação 24h gerado e copiado." : "Link de aprovação 24h gerado.")
      if (currentUser) {
        void loadTasks(currentUser.id)
      }
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível gerar o link de aprovação.")
    } finally {
      setGeneratingApprovalFileId("")
    }
  }

  const refreshFiles = () => {
    void loadFiles(selectedFolderId, searchTerm, fileView)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Drive</h1>
      </div>

      <FeedbackBanner message={feedbackMessage} type="success" />
      <FeedbackBanner message={feedbackError} type="error" />

      {!status.connected ? (
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-foreground">Conectar Google Drive</CardTitle>
          </div>
          <Button onClick={() => void connectDrive()} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link2 className="mr-2 h-4 w-4" />
            Logar com Google
          </Button>
        </CardHeader>
      </Card>
      ) : null}

      {status.connected && (
        <>
          <Card className="border-border bg-card">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                  {breadcrumbs.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center gap-1">
                      {index > 0 ? <ChevronRight className="h-4 w-4" /> : null}
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 font-medium text-foreground hover:bg-secondary"
                        onClick={() => goToBreadcrumb(index)}
                      >
                        {item.name}
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" className="w-full border-border xl:w-auto" onClick={refreshFiles} disabled={isLoadingFiles}>
                  {isLoadingFiles ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  Atualizar
                </Button>
              </div>
              <div className="rounded-[12px] border border-border bg-background/70 p-3">
                <div className="grid gap-3 xl:grid-cols-[1.2fr,0.55fr,1fr]">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Aprovação</span>
                    <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                      <SelectTrigger className="h-10 rounded-[8px] border-border bg-card px-3 text-sm shadow-none">
                        <SelectValue placeholder="Selecionar entrega" />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card">
                        {approvalTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tipo</span>
                    <Select value={fileView} onValueChange={(value: "all" | "video" | "folder") => setFileView(value)}>
                      <SelectTrigger className="h-10 rounded-[8px] border-border bg-card px-3 text-sm shadow-none">
                        <SelectValue placeholder="Tudo" />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card">
                        <SelectItem value="all">Tudo</SelectItem>
                        <SelectItem value="video">Vídeos</SelectItem>
                        <SelectItem value="folder">Pastas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pasta</span>
                    <Select
                      value={selectedFolderId}
                      onValueChange={(value) => {
                        const selectedClient = linkedClients.find((cliente) => cliente.driveFolderId === value)
                        openFolder(value, selectedClient?.driveFolderName || selectedClient?.nome || "Pasta")
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-[8px] border-border bg-card px-3 text-sm shadow-none">
                        <SelectValue placeholder="Pasta de cliente" />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card">
                        {linkedClients.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.driveFolderId || cliente.id}>
                            {cliente.nome} • {cliente.driveFolderName || "Pasta padrão"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          refreshFiles()
                        }
                      }}
                      placeholder="Buscar arquivo"
                      className="h-10 rounded-[8px] border-border bg-card pl-9 shadow-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <DrivePickerButton
                      mode="folder"
                      onPick={(folder) => openFolder(folder.id, folder.name)}
                      className="h-10 rounded-[8px] border-border px-3"
                    />
                    <DriveUploadDropzone
                      folderId={currentFolderId}
                      variant="button"
                      label="Upload Direto"
                      onUploaded={() => void loadFiles(selectedFolderId, searchTerm, fileView)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingFiles ? (
                <div className="flex items-center justify-center rounded-2xl border border-border bg-background px-6 py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando arquivos do Drive...
                </div>
              ) : !hasLoadedFiles ? (
                <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted-foreground">
                  Clique em Atualizar para carregar os arquivos desta pasta.
                </div>
              ) : visibleFiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted-foreground">
                  Nenhum arquivo encontrado nesse Drive ou filtro.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleFiles.map((file) => (
                    <Card key={file.id} className="border-border bg-background/80">
                      <CardHeader>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <FolderOpen className="h-5 w-5 text-primary" />
                          </div>
                          {isDriveFolder(file) ? (
                            <Badge className="bg-primary/15 text-primary">Pasta</Badge>
                          ) : isApprovalVideo(file) ? (
                            <Badge className="bg-primary/15 text-primary">Vídeo</Badge>
                          ) : (
                            <Badge variant="secondary">Arquivo</Badge>
                          )}
                        </div>
                        <CardTitle className="line-clamp-2 text-base text-foreground">{file.name}</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          {formatBytes(file.size)} • {file.modifiedTime ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(file.modifiedTime)) : "Data não informada"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid gap-2">
                          {isDriveFolder(file) ? (
                            <Button
                              type="button"
                              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={() => openFolder(file.id, file.name)}
                            >
                              <FolderOpen className="mr-2 h-4 w-4" />
                              Abrir pasta
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            className="w-full border-border bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={
                              isDriveFolder(file) ||
                              !isApprovalVideo(file) ||
                              !selectedTaskId ||
                              generatingApprovalFileId === file.id
                            }
                            onClick={() => void handleGenerateApprovalLink(file)}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            {generatingApprovalFileId === file.id ? "Gerando..." : "Link de aprovação 24h"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
