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
import { CONTACT_METHOD_LABELS, EDIT_TOOL_LABELS, EditorProfile, PROFILE_LANGUAGE_LABELS, slugify, VIDEO_STYLE_LABELS } from "@/lib/app-data"
import { Check, Copy, ExternalLink, Plus, Save, Trash2, User } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"
import { copyTextToClipboard } from "@/lib/clipboard"

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
    language: profile.language ?? "pt-BR",
    themeColors: profile.themeColors ?? {
      pageBackground: "#0b1020",
      cardBackground: "#11182d",
      textColor: "#f8fafc",
      accentColor: "#37352F",
    },
  })

  const serializeProfile = (profile: EditorProfile) =>
    JSON.stringify({
      ...normalizeProfile(profile),
      slug: slugify(profile.slug || profile.fullName),
      videoUrls: normalizeProfile(profile).videoUrls.map((url) => url.trim()),
      editTools: [...normalizeProfile(profile).editTools].sort(),
      videoStyles: [...normalizeProfile(profile).videoStyles].sort(),
      themeColors: normalizeProfile(profile).themeColors,
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
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar seu perfil.")
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
    const didCopy = await copyTextToClipboard(publicLink)
    if (didCopy) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Página Profissional</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${formData.slug}`} target="_blank">
            <Button variant="outline" className="border-border">
              Ver perfil público
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button type="button" variant="outline" className="border-border" onClick={handleCopyLink}>
            {copied ? <Check className="mr-2 h-4 w-4 text-primary" /> : <Copy className="mr-2 h-4 w-4" />}
            Copiar link
          </Button>
        </div>
      </div>

      {/* Profile Picture */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Foto de perfil</CardTitle>
          <CardDescription className="text-muted-foreground">
            Esta imagem aparece no topo do seu perfil público.
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
            <p className="text-xs text-muted-foreground">Use um link JPG, PNG ou GIF.</p>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Informações básicas</CardTitle>
          <CardDescription className="text-muted-foreground">
            Os principais dados que o cliente verá primeiro.
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
                placeholder="Exemplo: Editor de reels"
                value={formData.professionalTitle}
                onChange={(e) => setFormData({ ...formData, professionalTitle: e.target.value })}
                className="border-border bg-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-foreground">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Escreva um resumo curto do seu trabalho e do que te diferencia..."
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
              placeholder="Exemplo: Recife, PE"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Idioma do perfil</Label>
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData({ ...formData, language: value as EditorProfile["language"] })}
            >
              <SelectTrigger className="border-border bg-input text-foreground">
                <SelectValue placeholder="Selecione um idioma" />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover">
                {Object.entries(PROFILE_LANGUAGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-popover-foreground">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <CardTitle className="text-foreground">Essencial do portfólio</CardTitle>
          <CardDescription className="text-muted-foreground">
            Adicione os elementos que mais importam: vídeos em destaque, capa, ferramentas e estilo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Links de vídeos em destaque</Label>
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
            <Label htmlFor="banner-url" className="text-foreground">Imagem de capa</Label>
            <Input
              id="banner-url"
              placeholder="https://sua-capa.com/..."
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
            <Label className="text-foreground">Cores da página pública</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
              <Label className="text-foreground">Fundo</Label>
                <Input
                  type="color"
                  value={formData.themeColors.pageBackground}
                  onChange={(e) => setFormData({ ...formData, themeColors: { ...formData.themeColors, pageBackground: e.target.value } })}
                  className="h-12 border-border bg-input p-2"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Fundo dos cards</Label>
                <Input
                  type="color"
                  value={formData.themeColors.cardBackground}
                  onChange={(e) => setFormData({ ...formData, themeColors: { ...formData.themeColors, cardBackground: e.target.value } })}
                  className="h-12 border-border bg-input p-2"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Texto</Label>
                <Input
                  type="color"
                  value={formData.themeColors.textColor}
                  onChange={(e) => setFormData({ ...formData, themeColors: { ...formData.themeColors, textColor: e.target.value } })}
                  className="h-12 border-border bg-input p-2"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Cor de destaque</Label>
                <Input
                  type="color"
                  value={formData.themeColors.accentColor}
                  onChange={(e) => setFormData({ ...formData, themeColors: { ...formData.themeColors, accentColor: e.target.value } })}
                  className="h-12 border-border bg-input p-2"
                />
              </div>
            </div>
          </div>
          <div
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: formData.themeColors.cardBackground,
              color: formData.themeColors.textColor,
              borderColor: `${formData.themeColors.accentColor}55`,
            }}
          >
            <p className="text-sm font-medium" style={{ color: formData.themeColors.textColor }}>Prévia da página pública</p>
            <p className="mt-2 text-sm" style={{ color: `${formData.themeColors.textColor}CC` }}>
              Seu perfil público vai usar essas cores no fundo, nos cards, nos textos e nos destaques.
            </p>
            <div
              className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: `${formData.themeColors.accentColor}22`, color: formData.themeColors.accentColor }}
            >
              Prévia do destaque
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-foreground">Ferramentas de edição</Label>
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
          <CardTitle className="text-foreground">Contato principal</CardTitle>
          <CardDescription className="text-muted-foreground">
            Escolha a melhor forma para o cliente falar com você.
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
                <SelectValue placeholder="Selecione um canal de contato" />
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
                ? "Telefone"
                : formData.contactMethod === "instagram"
                  ? "Instagram"
                  : "Email"}
            </Label>
            <Input
              placeholder={
                formData.contactMethod === "phone"
                  ? "+1 (555) 123-4567"
                  : formData.contactMethod === "instagram"
                    ? "@seuinstagram"
                    : "voce@email.com"
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
          <CardTitle className="text-foreground">Prévia pública</CardTitle>
          <CardDescription className="text-muted-foreground">
            Prévia rápida das informações exibidas na sua página pública.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.editTools.length > 0 ? (
              formData.editTools.map((tool) => <Badge key={tool} variant="secondary">{EDIT_TOOL_LABELS[tool]}</Badge>)
            ) : (
              <span className="text-sm text-muted-foreground">Selecione pelo menos uma ferramenta de edição.</span>
            )}
          </div>
          {formData.editTools.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Se você selecionar After Effects ou qualquer outro app, ele vai aparecer publicamente como parte da sua stack de edição.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {formData.videoStyles.length > 0 ? (
              formData.videoStyles.map((style) => <Badge key={style} variant="secondary">{VIDEO_STYLE_LABELS[style]}</Badge>)
            ) : (
              <span className="text-sm text-muted-foreground">Selecione pelo menos um estilo de vídeo.</span>
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
              Salvar alterações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
