"use client"

import { useState } from "react"
import { BriefcaseBusiness, MapPin, MessageCircle, Plus, Trash2 } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"
import { isPublisherEmail, JobStatus } from "@/lib/app-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const initialForm = {
  title: "",
  company: "",
  location: "",
  format: "",
  salary: "",
  description: "",
  contact: "",
}

export default function VagasPage() {
  const { currentUser, jobs, createJob, deleteJob, updateJobStatus } = useAppSession()
  const [formData, setFormData] = useState(initialForm)
  const [message, setMessage] = useState("")

  if (!currentUser) return null

  const canPublish = isPublisherEmail(currentUser.email)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const result = await createJob(formData)
    setMessage(result.message ?? "")

    if (result.success) {
      setFormData(initialForm)
    }
  }

  const visibleJobs = jobs.filter((job) => job.status !== "cancelled")

  const handleStatusChange = async (jobId: string, status: JobStatus) => {
    const result = await updateJobStatus(jobId, status)
    setMessage(result.message ?? "")
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Área de Vagas</h1>
        <p className="mt-1 text-muted-foreground">
          Usuários do plano Starter para cima podem visualizar as oportunidades. A publicação fica restrita aos e-mails autorizados.
        </p>
      </div>

      {canPublish && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Publicar vaga</CardTitle>
            <CardDescription className="text-muted-foreground">
              Publicação habilitada para {currentUser.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Título da vaga</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="border-border bg-input" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Empresa</Label>
                  <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="border-border bg-input" required />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-foreground">Local</Label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="border-border bg-input" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Formato</Label>
                  <Input value={formData.format} onChange={(e) => setFormData({ ...formData, format: e.target.value })} className="border-border bg-input" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Faixa</Label>
                  <Input value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} className="border-border bg-input" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Descrição</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-28 resize-none border-border bg-input" required />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Contato</Label>
                <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} className="border-border bg-input" placeholder="@instagram, e-mail ou telefone" required />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{message}</span>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Publicar vaga
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {visibleJobs.map((job) => (
          <Card key={job.id} className="border-border bg-card">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-foreground">{job.title}</CardTitle>
                  <CardDescription className="mt-1 text-muted-foreground">{job.company}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-secondary px-3 py-1">{job.format}</span>
                  <span className="rounded-full bg-secondary px-3 py-1">{job.salary}</span>
                  {job.status === "found" && (
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                      Encontrada
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {job.contact}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{job.description}</p>
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2 text-sm text-foreground">
                  <BriefcaseBusiness className="h-4 w-4 text-primary" />
                  Publicado por {job.publishedBy}
                </div>
                {canPublish && currentUser.email === job.publishedBy && (
                  <div className="flex flex-wrap gap-2">
                    {job.status !== "found" && (
                      <Button variant="outline" className="border-border" onClick={() => handleStatusChange(job.id, "found")}>
                        Marcar encontrada
                      </Button>
                    )}
                    <Button variant="outline" className="border-border" onClick={() => handleStatusChange(job.id, "cancelled")}>
                      Cancelar
                    </Button>
                    <Button variant="outline" className="border-border" onClick={() => void deleteJob(job.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
