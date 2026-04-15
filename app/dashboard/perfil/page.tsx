"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CONTACT_METHOD_LABELS, EDIT_TOOL_LABELS, EditorProfile, slugify, VIDEO_STYLE_LABELS } from "@/lib/app-data"
import { Check, Copy, ExternalLink, Plus, Save, Trash2, User } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"

const editTools = Object.entries(EDIT_TOOL_LABELS)
const videoStyles = Object.entries(VIDEO_STYLE_LABELS)

export default function PerfilPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const [copied, setCopied] = useState(false)
  const { currentUser, saveCurrentUserProfile } = useAppSession()
  const [formData, setFormData] = useState<EditorProfile | null>(null)

  const normalizeProfile = (profile: EditorProfile): EditorProfile => ({
    ...profile,
    videoUrls: Array.isArray(profile.videoUrls) && profile.videoUrls.length > 0 ? profile.videoUrls : [""],
    editTools: Array.isArray(profile.editTools) ? profile.editTools : [],
    videoStyles: Array.isArray(profile.videoStyles) ? profile.videoStyles : [],
    bannerUrl: profile.bannerUrl ?? "",
    photoUrl: profile.photoUrl ?? "",
    contactValue: profile.contactValue ?? "",
  })

  const serializeProfile = (profile: EditorProfile) =>
    JSON.stringify({
      ...normalizeProfile(profile),
      slug: slugify(profile.slug || profile.fullName),
      videoUrls: normalizeProfile(profile).videoUrls.map((url) => url.trim()),
      editTools: [...normalizeProfile(profile).editTools].sort(),
      videoStyles: [...normalizeProfile(profile).videoStyles].sort(),
    })

  useEffect(() => {
    if (currentUser) {
      setFormData(normalizeProfile(currentUser.profile))
    }
  }, [currentUser])

  const handleSave = async () => {
    if (!formData) return

    setIsSaving(true)
    setMessage("")
    setMessageType("")

    try {
      const result = await saveCurrentUserProfile({
        ...formData,
        slug: slugify(formData.slug || formData.fullName),
      })
      setMessage(result.message ?? "")
      setMessageType(result.success ? "success" : "error")
      if (result.success && result.profile) {
        setFormData(normalizeProfile(result.profile))
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o perfil.")
      setMessageType("error")
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentUser || !formData) return null

  const hasChanges = serializeProfile(formData) !== serializeProfile(currentUser.profile)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const publicLink = `${baseUrl}/${formData.slug}`

  const handleCopyLink = async () => {
    if (!publicLink) return
    await navigator.clipboard.writeText(publicLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Perfil Profissional</h1>
        <p className="mt-1 text-muted-foreground">
          Configure seu perfil público com foto, vídeos, banner, ferramentas e contato principal
        </p>
      </div>

      {/* Profile Picture */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Foto de Perfil</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sua foto será exibida no seu perfil público
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-secondary bg-cover bg-center"
            style={formData.photoUrl ? { backgroundImage: `url(${formData.photoUrl})` } : undefined}
          >
            {!formData.photoUrl && <User className="h-12 w-12 text-muted-foreground" />}
          </div>
          <div className="space-y-2">
            <Input
              placeholder="https://sua-foto.com/..."
              value={formData.photoUrl}
              onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máximo 2MB.</p>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Informações Básicas</CardTitle>
          <CardDescription className="text-muted-foreground">
            Dados que serão exibidos no seu perfil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Nome completo</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="border-border bg-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">Título profissional</Label>
              <Input
                id="title"
                placeholder="Ex: Editor de Reels"
                value={formData.professionalTitle}
                onChange={(e) => setFormData({ ...formData, professionalTitle: e.target.value })}
                className="border-border bg-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-foreground">Biografia</Label>
            <Textarea
              id="bio"
              placeholder="Conte um pouco sobre você e seu trabalho..."
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground">Localização</Label>
            <Input
              id="location"
              placeholder="Ex: São Paulo, SP"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-foreground">Link público</Label>
            <Input
              id="slug"
              placeholder="seu-nome"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Seu perfil ficará disponível em {publicLink}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Vídeo, Banner e Especialidades</CardTitle>
          <CardDescription className="text-muted-foreground">
            Adicione seus vídeos, banner e defina seu posicionamento profissional
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Links dos vídeos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border"
                onClick={() => setFormData({ ...formData, videoUrls: [...formData.videoUrls, ""] })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar vídeo
              </Button>
            </div>
            <div className="space-y-3">
              {formData.videoUrls.map((videoUrl, index) => (
                <div key={`${index}-${videoUrl}`} className="flex gap-2">
                  <Input
                    placeholder={`https://youtube.com/... (${index + 1})`}
                    value={videoUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        videoUrls: formData.videoUrls.map((currentUrl, currentIndex) =>
                          currentIndex === index ? e.target.value : currentUrl
                        ),
                      })
                    }
                    className="border-border bg-input text-foreground placeholder:text-muted-foreground"
                  />
                  {formData.videoUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="border-border"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          videoUrls: formData.videoUrls.filter((_, currentIndex) => currentIndex !== index),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner-url" className="text-foreground">Banner de fundo</Label>
            <Input
              id="banner-url"
              placeholder="https://imagem-do-banner.com/..."
              value={formData.bannerUrl}
              onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          {formData.bannerUrl && (
            <div
              className="h-32 rounded-xl border border-border bg-cover bg-center"
              style={{ backgroundImage: `url(${formData.bannerUrl})` }}
            />
          )}
          <div className="space-y-3">
            <Label className="text-foreground">Ferramentas que você edita</Label>
            <div className="flex flex-wrap gap-2">
              {editTools.map(([value, label]) => {
                const isActive = formData.editTools.includes(value as EditorProfile["editTools"][number])

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        editTools: isActive
                          ? formData.editTools.filter((tool) => tool !== value)
                          : [...formData.editTools, value as EditorProfile["editTools"][number]],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-foreground">Estilo de vídeo</Label>
            <div className="flex flex-wrap gap-2">
              {videoStyles.map(([value, label]) => {
                const isActive = formData.videoStyles.includes(value as EditorProfile["videoStyles"][number])

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        videoStyles: isActive
                          ? formData.videoStyles.filter((style) => style !== value)
                          : [...formData.videoStyles, value as EditorProfile["videoStyles"][number]],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Contato Principal</CardTitle>
          <CardDescription className="text-muted-foreground">
            Escolha como o cliente deve falar com você no perfil público
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Canal de contato</Label>
            <Select
              value={formData.contactMethod}
              onValueChange={(value) =>
                setFormData({ ...formData, contactMethod: value as EditorProfile["contactMethod"] })
              }
            >
              <SelectTrigger className="border-border bg-input text-foreground">
                <SelectValue placeholder="Selecione um meio de contato" />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover">
                {Object.entries(CONTACT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-popover-foreground">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">
              {formData.contactMethod === "phone"
                ? "Número de telefone"
                : formData.contactMethod === "instagram"
                  ? "Instagram"
                  : "E-mail"}
            </Label>
            <Input
              placeholder={
                formData.contactMethod === "phone"
                  ? "(11) 99999-9999"
                  : formData.contactMethod === "instagram"
                    ? "@seuinstagram"
                    : "seu@email.com"
              }
              value={formData.contactValue}
              onChange={(e) => setFormData({ ...formData, contactValue: e.target.value })}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Resumo público</CardTitle>
          <CardDescription className="text-muted-foreground">
            Prévia rápida do que vai aparecer no seu link profissional
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.editTools.length > 0 ? (
              formData.editTools.map((tool) => <Badge key={tool} variant="secondary">{EDIT_TOOL_LABELS[tool]}</Badge>)
            ) : (
              <span className="text-sm text-muted-foreground">Selecione pelo menos uma ferramenta.</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.videoStyles.length > 0 ? (
              formData.videoStyles.map((style) => <Badge key={style} variant="secondary">{VIDEO_STYLE_LABELS[style]}</Badge>)
            ) : (
              <span className="text-sm text-muted-foreground">Selecione um estilo de vídeo.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/${formData.slug}`} target="_blank" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              Ver perfil público
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Button type="button" variant="outline" className="border-border" onClick={handleCopyLink}>
              {copied ? <Check className="mr-2 h-4 w-4 text-primary" /> : <Copy className="mr-2 h-4 w-4" />}
              Copiar link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between gap-4">
        <div className={`text-sm ${messageType === "error" ? "text-destructive" : messageType === "success" ? "text-primary" : "text-muted-foreground"}`}>
          {message}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSaving ? (
            "Salvando..."
          ) : !hasChanges ? (
            "Perfil atualizado"
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
