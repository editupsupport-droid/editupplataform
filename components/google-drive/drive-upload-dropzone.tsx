"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { getSupabaseAccessToken } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type DriveUploadDropzoneProps = {
  folderId: string
  onUploaded?: (file: { id?: string; name?: string }) => void
  variant?: "dropzone" | "button"
  label?: string
}

export function DriveUploadDropzone({ folderId, onUploaded, variant = "dropzone", label = "Upload direto" }: DriveUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [successMessage, setSuccessMessage] = useState("")

  const uploadFile = (file: File) =>
    new Promise<void>((resolve, reject) => {
      const formData = new FormData()
      formData.append("folderId", folderId)
      formData.append("file", file)

      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/google-drive/upload")
      void getSupabaseAccessToken()
        .then((token) => {
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`)
          }
          xhr.send(formData)
        })
        .catch(() => reject(new Error("Não foi possível autenticar o upload do Drive.")))

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const nextProgress = Math.round((event.loaded / event.total) * 100)
          setProgress(nextProgress)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const payload = JSON.parse(xhr.responseText || "{}") as { file?: { id?: string; name?: string } }
          setSuccessMessage(`Upload concluído: ${file.name}`)
          onUploaded?.(payload.file ?? { name: file.name })
          resolve()
          return
        }

        try {
          const payload = JSON.parse(xhr.responseText || "{}") as { error?: string }
          reject(new Error(payload.error ?? "Não foi possível enviar o arquivo."))
        } catch {
          reject(new Error("Não foi possível enviar o arquivo."))
        }
      }

      xhr.onerror = () => reject(new Error("Falha de rede ao enviar o arquivo."))
    })

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || !folderId) return
    const file = fileList[0]
    setIsUploading(true)
    setProgress(0)
    setSuccessMessage("")

    try {
      await uploadFile(file)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.")
    } finally {
      setIsUploading(false)
    }
  }

  if (variant === "button") {
    return (
      <div className="space-y-2">
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading || !folderId} className="h-10 rounded-[8px] bg-primary px-4 text-primary-foreground hover:bg-primary/90">
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          {isUploading ? `${progress}%` : label}
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => void handleFiles(event.target.files)} />
        {successMessage ? <p className="text-xs font-medium text-primary">{successMessage}</p> : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          void handleFiles(event.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-2xl border border-dashed px-6 py-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"
        )}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <UploadCloud className="h-6 w-6 text-primary" />}
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">Arraste um arquivo para enviar direto ao Drive</p>
        <p className="mt-1 text-sm text-muted-foreground">Ou clique para escolher um arquivo do seu computador.</p>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => void handleFiles(event.target.files)} />
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Enviando para o Google Drive</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  )
}
