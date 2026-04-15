"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, ExternalLink, Play, XCircle } from "lucide-react"
import { WorkspaceTask } from "@/lib/workspace-store"

export default function AprovacaoPage() {
  const params = useParams<{ id: string }>()
  const taskId = typeof params.id === "string" ? params.id : ""
  const [tarefa, setTarefa] = useState<WorkspaceTask | null>(null)
  const [feedback, setFeedback] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [statusResposta, setStatusResposta] = useState<WorkspaceTask["statusCliente"]>("pendente")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!taskId) return

    const loadTask = async () => {
      try {
        const response = await fetch(`/api/approval/${taskId}`, { cache: "no-store" })
        const data = (await response.json()) as {
          available?: boolean
          task?: Pick<WorkspaceTask, "id" | "titulo" | "descricao" | "clienteNome" | "linkDrive" | "statusCliente">
        }

        if (response.ok && data.available && data.task) {
          setTarefa({
            id: data.task.id,
            titulo: data.task.titulo,
            descricao: data.task.descricao ?? "",
            clienteId: "",
            clienteNome: data.task.clienteNome ?? "",
            prazo: new Date().toISOString(),
            colunaId: "em-producao",
            linkDrive: data.task.linkDrive ?? "",
            statusCliente: data.task.statusCliente ?? "pendente",
          })
        } else {
          setTarefa(null)
        }
      } catch (error) {
        console.error(error)
        setTarefa(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadTask()
  }, [taskId])

  const submitApproval = async (action: "approve" | "revision") => {
    if (!taskId) return

    const response = await fetch(`/api/approval/${taskId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        feedback: action === "revision" ? feedback.trim() : "",
      }),
    })

    if (!response.ok) return

    setStatusResposta(action === "approve" ? "concluido" : "refazendo")
    setIsSubmitted(true)
  }

  const handleAprovar = () => {
    void submitApproval("approve")
  }

  const handleEnviarFeedback = () => {
    if (!feedback.trim()) return
    void submitApproval("revision")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  if (!tarefa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg border-border bg-card">
          <CardContent className="space-y-4 p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">Link indisponível</h1>
            <p className="text-muted-foreground">
              Esse link já expirou, foi removido, ainda não existe no banco ou precisa ser gerado novamente na Agenda.
            </p>
            <Link href="/" className="inline-flex">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Voltar</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted && statusResposta === "concluido") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">Vídeo aprovado</h2>
            <p className="text-center text-muted-foreground">
              Obrigado. A entrega foi marcada como concluída e o link de aprovação foi encerrado.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted && statusResposta === "refazendo") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">Feedback enviado</h2>
            <p className="mb-6 text-center text-muted-foreground">
              O editor foi avisado e a tarefa voltou para refação.
            </p>
            <div className="w-full rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
              &quot;{feedback}&quot;
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <Play className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">Aprovar vídeo</CardTitle>
          <CardDescription className="text-muted-foreground">
            Revise a entrega e informe se está aprovada ou precisa de ajustes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projeto</span>
              <span className="text-sm font-medium text-foreground">{tarefa.titulo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cliente</span>
              <span className="text-sm text-foreground">{tarefa.clienteNome}</span>
            </div>
            {tarefa.descricao && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Descrição</span>
                <p className="text-sm text-foreground">{tarefa.descricao}</p>
              </div>
            )}
          </div>

          {tarefa.linkDrive && (
            <a
              href={tarefa.linkDrive}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-primary transition-colors hover:bg-primary/20"
            >
              <ExternalLink className="h-5 w-5" />
              <span className="font-medium">Abrir vídeo</span>
            </a>
          )}

          {showFeedback ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">O que precisa ser ajustado?</Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Descreva as alterações necessárias..."
                  className="min-h-[120px] border-border bg-background"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setShowFeedback(false)}>
                  Voltar
                </Button>
                <Button className="flex-1 bg-red-500 text-white hover:bg-red-600" onClick={handleEnviarFeedback} disabled={!feedback.trim()}>
                  Enviar feedback
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => setShowFeedback(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Precisa refazer
              </Button>
              <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAprovar}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Aprovar
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Desenvolvido por{" "}
            <Link href="/" className="text-primary hover:underline">
              Astherisch
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
