"use client"

import { useState } from "react"
import { ChevronRight, FolderOpen, Loader2, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authFetch } from "@/lib/supabase"

type PickedDriveItem = {
  id: string
  name: string
  mimeType?: string
  url?: string
}

type DrivePickerButtonProps = {
  mode: "folder" | "video"
  onPick: (item: PickedDriveItem) => void
  disabled?: boolean
  className?: string
}

type DriveBrowserItem = {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
}

const folderMimeType = "application/vnd.google-apps.folder"

export function DrivePickerButton({ mode, onPick, disabled, className }: DrivePickerButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [browserLoading, setBrowserLoading] = useState(false)
  const [browserError, setBrowserError] = useState("")
  const [items, setItems] = useState<DriveBrowserItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([{ id: "", name: "Meu Drive" }])

  const currentFolder = breadcrumbs[breadcrumbs.length - 1] ?? { id: "", name: "Meu Drive" }

  const loadBrowserItems = async (folderId = currentFolder.id) => {
    setBrowserLoading(true)
    setBrowserError("")

    try {
      const params = new URLSearchParams()
      if (folderId) params.set("folderId", folderId)
      const response = await authFetch(`/api/google-drive/files?${params.toString()}`)
      const payload = (await response.json().catch(() => ({}))) as { files?: DriveBrowserItem[]; error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível listar o Drive.")
      }

      const nextItems = (payload.files ?? [])
        .filter((item) => mode === "folder" || item.mimeType === folderMimeType || item.mimeType.includes("video/"))
        .sort((a, b) => {
          const aIsFolder = a.mimeType === folderMimeType
          const bIsFolder = b.mimeType === folderMimeType
          if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
          return a.name.localeCompare(b.name, "pt-BR")
        })

      setItems(nextItems)
    } catch (error) {
      console.error(error)
      setBrowserError(error instanceof Error ? error.message : "Não foi possível listar o Drive.")
    } finally {
      setBrowserLoading(false)
    }
  }

  const openInternalBrowser = async () => {
    setBrowserOpen(true)
    setBreadcrumbs([{ id: "", name: "Meu Drive" }])
    await loadBrowserItems("")
  }

  const openFolder = async (folder: DriveBrowserItem) => {
    const nextBreadcrumbs = [...breadcrumbs, { id: folder.id, name: folder.name }]
    setBreadcrumbs(nextBreadcrumbs)
    await loadBrowserItems(folder.id)
  }

  const goToBreadcrumb = async (index: number) => {
    const nextBreadcrumbs = breadcrumbs.slice(0, index + 1)
    const target = nextBreadcrumbs[nextBreadcrumbs.length - 1] ?? { id: "", name: "Meu Drive" }
    setBreadcrumbs(nextBreadcrumbs)
    await loadBrowserItems(target.id)
  }

  const pickItem = (item: DriveBrowserItem) => {
    onPick({
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      url: item.webViewLink,
    })
    setBrowserOpen(false)
  }

  const openPicker = async () => {
    setIsLoading(true)
    await openInternalBrowser()
    setIsLoading(false)
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => void openPicker()} disabled={disabled || isLoading} className={className}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : mode === "folder" ? (
          <FolderOpen className="mr-2 h-4 w-4" />
        ) : (
          <Video className="mr-2 h-4 w-4" />
        )}
        {mode === "folder" ? "Selecionar pasta do Drive" : "Selecionar vídeo do Drive"}
      </Button>

      <Dialog open={browserOpen} onOpenChange={setBrowserOpen}>
        <DialogContent className="max-h-[82vh] max-w-3xl overflow-hidden border-border bg-card p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>{mode === "folder" ? "Selecionar pasta" : "Selecionar vídeo"}</DialogTitle>
            <DialogDescription>Escolha direto pelo Drive conectado ao EditUp.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-1 border-b border-border px-5 py-3 text-sm text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-4 w-4" /> : null}
                <button
                  type="button"
                  className="rounded-md px-2 py-1 font-medium text-foreground hover:bg-secondary"
                  onClick={() => void goToBreadcrumb(index)}
                >
                  {item.name}
                </button>
              </div>
            ))}
          </div>
          <div className="max-h-[52vh] overflow-y-auto px-5 py-4">
            {browserLoading ? (
              <div className="flex items-center justify-center rounded-xl border border-border bg-background px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando Drive...
              </div>
            ) : browserError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{browserError}</div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum item encontrado.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const isFolder = item.mimeType === folderMimeType
                  const canPick = mode === "folder" ? isFolder : !isFolder && item.mimeType.includes("video/")

                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => (isFolder ? void openFolder(item) : canPick ? pickItem(item) : undefined)}
                      >
                        {isFolder ? <FolderOpen className="h-5 w-5 shrink-0 text-primary" /> : <Video className="h-5 w-5 shrink-0 text-primary" />}
                        <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        {isFolder ? (
                          <Button type="button" variant="outline" size="sm" className="border-border" onClick={() => void openFolder(item)}>
                            Abrir
                          </Button>
                        ) : null}
                        {canPick ? (
                          <Button type="button" size="sm" onClick={() => pickItem(item)}>
                            Selecionar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
