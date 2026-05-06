"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Brush,
  CreditCard,
  ExternalLink,
  Globe2,
  HardDrive,
  Laptop,
  Link2,
  LogOut,
  MessageCircleMore,
  Palette,
  Search,
  Shield,
  SlidersHorizontal,
  User,
  Users,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useAppSession } from "@/components/app/app-provider"
import { useAppPreferences } from "@/components/app/preferences-provider"
import { PLAN_LABELS } from "@/lib/app-data"
import { builtInAppearanceThemes } from "@/lib/appearance"
import { cn } from "@/lib/utils"
import PerfilPage from "@/app/dashboard/perfil/page"
import { authFetch } from "@/lib/supabase"
import { QuoteBuilderSettings } from "@/components/quote/quote-builder-settings"

const DISMISS_KEY = "editup-notification-popup-disabled"
const ASK_LATER_KEY = "editup-notification-popup-dismissed"
const TIME_FORMAT_KEY = "editup-time-format"

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ED"

type SettingsSection =
  | "account"
  | "devices"
  | "notifications"
  | "privacy"
  | "appearance"
  | "accessibility"
  | "language-time"
  | "plans"
  | "professional"
  | "quotes"
  | "community"
  | "logout"

const sectionGroups: Array<{
  title: string
  items: Array<{ id: SettingsSection; label: string; icon: LucideIcon; keywords: string }>
}> = [
  {
    title: "Configurações do Usuário",
    items: [
      { id: "account", label: "Conta", icon: User, keywords: "conta perfil senha email" },
      { id: "devices", label: "Dispositivos", icon: Laptop, keywords: "dispositivos sessoes segurança login" },
      { id: "notifications", label: "Notificações", icon: Bell, keywords: "notificações alertas badges browser" },
      { id: "privacy", label: "Privacidade", icon: Shield, keywords: "privacidade perfil online mensagens logs ip" },
      { id: "professional", label: "Página Profissional", icon: ExternalLink, keywords: "portfolio pagina profissional perfil publico" },
      { id: "quotes", label: "Orçamentos", icon: CreditCard, keywords: "orçamentos briefing propostas preço formulário quote builder" },
      { id: "community", label: "Comunidade", icon: Users, keywords: "discord whatsapp comunidade" },
    ],
  },
  {
    title: "Configurações do App",
    items: [
      { id: "appearance", label: "Aparência", icon: Palette, keywords: "tema cores light discord midnight forest cyberpunk" },
      { id: "accessibility", label: "Acessibilidade", icon: SlidersHorizontal, keywords: "fonte movimento saturação leitor tela aria" },
      { id: "language-time", label: "Idioma e hora", icon: Globe2, keywords: "idioma tempo language time 12 24 auto" },
      { id: "plans", label: "Planos", icon: CreditCard, keywords: "plano billing transações pagamento" },
      { id: "logout", label: "Sair", icon: LogOut, keywords: "sair logout sessão desconectar" },
    ],
  },
]

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { currentUser, logoutUser, refreshCurrentUser } = useAppSession()
  const { language, setLanguage, setTheme } = useAppPreferences()
  const [activeSection, setActiveSection] = useState<SettingsSection>("account")
  const [settingsSearch, setSettingsSearch] = useState("")
  const [plansTab, setPlansTab] = useState<"manage" | "history">("manage")
  const [timeFormat, setTimeFormat] = useState<"auto" | "12" | "24">("auto")
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [driveStatus, setDriveStatus] = useState<{ connected: boolean; driveEmail?: string }>({ connected: false })
  const [profileVisibility, setProfileVisibility] = useState("public")
  const [showOnlineStatus, setShowOnlineStatus] = useState(true)
  const [allowDirectMessages, setAllowDirectMessages] = useState(true)
  const [fontScale, setFontScale] = useState(16)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [colorSaturation, setColorSaturation] = useState(100)
  const [accountName, setAccountName] = useState("")
  const [accountPhotoUrl, setAccountPhotoUrl] = useState("")
  const [accountPhotoPosition, setAccountPhotoPosition] = useState({ x: 50, y: 50 })
  const [pixKey, setPixKey] = useState("")
  const [photoPositionDialogOpen, setPhotoPositionDialogOpen] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountMessage, setAccountMessage] = useState("")
  const [notifications, setNotifications] = useState({
    email: true,
    updates: true,
    marketing: false,
    browserPrompt: true,
  })

  const loadDriveStatus = async () => {
    const response = await authFetch("/api/google-drive/status")
    const payload = (await response.json().catch(() => ({}))) as { connected?: boolean; driveEmail?: string }
    if (response.ok) {
      setDriveStatus({ connected: Boolean(payload.connected), driveEmail: payload.driveEmail })
    }
  }

  const connectDrive = async () => {
    const response = await authFetch("/api/google-drive/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnTo: "/dashboard/configuracoes" }),
    })
    const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
    if (!response.ok || !payload.url) {
      throw new Error(payload.error ?? "Não foi possível iniciar a conexão com o Google Drive.")
    }
    window.location.href = payload.url
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    setNotifications((current) => ({
      ...current,
      browserPrompt: window.localStorage.getItem(DISMISS_KEY) !== "true",
    }))
    const storedTimeFormat = window.localStorage.getItem(TIME_FORMAT_KEY)
    if (storedTimeFormat === "auto" || storedTimeFormat === "12" || storedTimeFormat === "24") {
      setTimeFormat(storedTimeFormat)
    }
  }, [])

  useEffect(() => {
    void loadDriveStatus()
  }, [])

  useEffect(() => {
    const loadAccountPreferences = async () => {
      const response = await authFetch("/api/preferences")
      const payload = (await response.json().catch(() => ({}))) as { preferences?: { pixKey?: string } }
      if (response.ok) {
        setPixKey(payload.preferences?.pixKey ?? "")
      }
    }

    void loadAccountPreferences()
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TIME_FORMAT_KEY, timeFormat)
    }
  }, [timeFormat])

  useEffect(() => {
    if (typeof document === "undefined") return

    document.documentElement.style.fontSize = `${fontScale}px`
    document.body.style.filter = `saturate(${colorSaturation}%)`

    let style = document.getElementById("editup-reduced-motion-style") as HTMLStyleElement | null
    if (reducedMotion) {
      if (!style) {
        style = document.createElement("style")
        style.id = "editup-reduced-motion-style"
        document.head.appendChild(style)
      }
      style.textContent = "*, *::before, *::after { transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; scroll-behavior: auto !important; }"
    } else {
      style?.remove()
    }
  }, [colorSaturation, fontScale, reducedMotion])

  useEffect(() => {
    setAccountName(currentUser?.name ?? "")
    setAccountPhotoUrl(currentUser?.accountPhotoUrl ?? "")
    setAccountPhotoPosition(currentUser?.accountPhotoPosition ?? { x: 50, y: 50 })
    setAccountMessage("")
  }, [currentUser])

  const visibleGroups = useMemo(() => {
    const query = settingsSearch.trim().toLowerCase()
    if (!query) return sectionGroups

    return sectionGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(query)),
      }))
      .filter((group) => group.items.length > 0)
  }, [settingsSearch])

  const displayName = accountName || currentUser?.name || "Editor"
  const photoUrl = accountPhotoUrl.trim()
  const planLabel = currentUser ? PLAN_LABELS[currentUser.plan] : "Free"

  const handleSaveAccount = async () => {
    setAccountSaving(true)
    setAccountMessage("")
    try {
      const response = await authFetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: accountName.trim(),
          accountPhotoUrl: accountPhotoUrl.trim(),
          accountPhotoPosition,
          pixKey: pixKey.trim(),
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível salvar sua conta.")
      }
      await refreshCurrentUser()
      setAccountMessage("Conta atualizada com sucesso.")
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "Não foi possível salvar sua conta.")
    } finally {
      setAccountSaving(false)
    }
  }

  const handleAccountPhotoUpload = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setAccountMessage("Envie um arquivo de imagem.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAccountPhotoUrl(reader.result)
        setAccountPhotoPosition({ x: 50, y: 50 })
        setPhotoPositionDialogOpen(true)
        setAccountMessage("")
      }
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = async () => {
    await logoutUser()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="self-start overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-6 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-background px-3 py-2.5 sm:py-3">
              <Avatar className="h-10 w-10 rounded-lg border border-border">
                {photoUrl ? <AvatarImage src={photoUrl} alt={displayName} /> : null}
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{currentUser?.email}</p>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={settingsSearch}
                onChange={(event) => setSettingsSearch(event.target.value)}
                placeholder="Buscar configurações"
                className="border-border bg-background pl-9"
                aria-label="Buscar configurações"
              />
            </div>
          </div>

          <nav className="space-y-4 p-3 sm:p-4 lg:space-y-5">
            {visibleGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <p className="px-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.title}</p>
                {group.items.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors",
                      activeSection === section.id
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                  >
                    <section.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{section.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Configurações</h1>
              <p className="mt-1 text-sm text-muted-foreground">Controle conta, privacidade, aparência e acessibilidade.</p>
            </div>
            <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => router.push("/dashboard")} aria-label="Fechar configurações">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {activeSection === "account" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Conta</CardTitle>
                <CardDescription>Dados principais da sua conta EditUp.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button
                      type="button"
                      className="group/avatar relative block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => document.getElementById("account-photo-upload")?.click()}
                      aria-label="Alterar foto da conta"
                    >
                      <Avatar className="h-16 w-16 rounded-xl border border-border">
                        {photoUrl ? (
                          <AvatarImage
                            src={photoUrl}
                            alt={displayName}
                            className="object-cover"
                            style={{ objectPosition: `${accountPhotoPosition.x}% ${accountPhotoPosition.y}%` }}
                          />
                        ) : null}
                        <AvatarFallback className="rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm transition-colors group-hover/avatar:bg-secondary">
                        <Brush className="h-3.5 w-3.5" />
                      </span>
                    </button>
                    <Input
                      id="account-photo-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => handleAccountPhotoUpload(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{displayName}</p>
                    <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                  </div>
                </div>
                {accountMessage ? (
                  <p className={cn("text-sm", accountMessage.includes("sucesso") ? "text-primary" : "text-destructive")}>{accountMessage}</p>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Nome de utilizador</Label>
                    <Input
                      id="account-name"
                      value={accountName}
                      onChange={(event) => setAccountName(event.target.value)}
                      aria-label="Nome do usuário"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-email">Email</Label>
                    <Input id="account-email" value={currentUser?.email ?? ""} readOnly aria-label="Email do usuário" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="account-pix">Chave Pix</Label>
                    <Input
                      id="account-pix"
                      value={pixKey}
                      onChange={(event) => setPixKey(event.target.value)}
                      placeholder="CPF, email, telefone ou chave aleatória"
                      aria-label="Chave Pix"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique na foto ou no pincel para enviar uma imagem. A foto da conta não altera a Página Profissional.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveAccount} disabled={accountSaving || !accountName.trim()}>
                    {accountSaving ? "Salvando..." : "Salvar conta"}
                  </Button>
                  <Button variant="outline" className="border-border">Alterar Senha</Button>
                  {photoUrl ? (
                    <Button type="button" variant="outline" className="border-border" onClick={() => setPhotoPositionDialogOpen(true)}>
                      Posicionar foto
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "devices" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Dispositivos</CardTitle>
                <CardDescription>Sessões ativas e segurança.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-foreground">Google Drive</p>
                      <p className="text-sm text-muted-foreground">
                        {driveStatus.connected ? driveStatus.driveEmail || "Conectado" : "Desconectado"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border"
                    onClick={() => void connectDrive()}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {driveStatus.connected ? "Reconectar" : "Conectar"}
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <Laptop className="h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-foreground">Navegador atual</p>
                      <p className="text-sm text-muted-foreground">Sessão ativa agora</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-lg text-muted-foreground hover:text-destructive" aria-label="Revogar sessão">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "notifications" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>Alertas, badges e permissão do navegador.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ["email", "Notificações por email", "Receba atualizações importantes da conta."],
                  ["updates", "Atualizações de conteúdo", "Saiba quando novos presets ou aulas forem adicionados."],
                  ["marketing", "Emails promocionais", "Receba novidades, campanhas e avisos comerciais."],
                  ["browserPrompt", "Permissão do navegador", "Perguntar ao usuário se deseja ativar alertas no navegador."],
                ].map(([key, title, description]) => (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4">
                    <div>
                      <p className="font-medium text-foreground">{title}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={notifications[key as keyof typeof notifications]}
                      onCheckedChange={(checked) => {
                        setNotifications((current) => ({ ...current, [key]: checked }))
                        if (key === "browserPrompt") {
                          window.localStorage.setItem(DISMISS_KEY, checked ? "false" : "true")
                          if (checked) window.localStorage.removeItem(ASK_LATER_KEY)
                        }
                      }}
                      aria-label={title}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeSection === "privacy" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Privacidade</CardTitle>
                <CardDescription>Controle visibilidade, status e contato direto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Visibilidade do Perfil</Label>
                  <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                    <SelectTrigger aria-label="Visibilidade do perfil">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="link">Apenas com Link</SelectItem>
                      <SelectItem value="private">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <div>
                    <p className="font-medium text-foreground">Status de Atividade</p>
                    <p className="text-sm text-muted-foreground">Mostrar quando estou online para clientes.</p>
                  </div>
                  <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} aria-label="Mostrar quando estou online para clientes" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <div>
                    <p className="font-medium text-foreground">Mensagens Diretas</p>
                    <p className="text-sm text-muted-foreground">Permitir que novos clientes enviem mensagens sem orçamento prévio.</p>
                  </div>
                  <Switch checked={allowDirectMessages} onCheckedChange={setAllowDirectMessages} aria-label="Permitir mensagens diretas de novos clientes" />
                </div>
                <Button variant="outline" className="border-border" onClick={() => alert("Últimos logins\n127.0.0.1 - agora\n192.168.0.112 - sessão local")}>
                  Ver logs de acesso
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === "appearance" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>Clique em um tema para aplicar instantaneamente.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {builtInAppearanceThemes.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTheme(preset)}
                    className="rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Aplicar tema ${preset.name}`}
                  >
                    <div className="mb-4 flex gap-2">
                      {[preset.background, preset.text, preset.accent].map((color, index) => (
                        <span key={`${preset.id}-${index}`} className="h-7 w-7 rounded-full border border-border" style={{ background: color }} />
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{preset.background} • {preset.accent}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {activeSection === "accessibility" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Acessibilidade</CardTitle>
                <CardDescription>Ajustes para conforto visual, foco e navegação por voz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="font-scale">Escala da Fonte</Label>
                    <span className="text-sm text-muted-foreground">{fontScale}px</span>
                  </div>
                  <Slider id="font-scale" min={12} max={20} step={1} value={[fontScale]} onValueChange={([value]) => setFontScale(value)} aria-label="Escala da fonte" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <div>
                    <p className="font-medium text-foreground">Movimento Reduzido</p>
                    <p className="text-sm text-muted-foreground">Desativar animações de transição para foco.</p>
                  </div>
                  <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} aria-label="Ativar movimento reduzido" />
                </div>
                <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="color-saturation">Saturação de Cores</Label>
                    <span className="text-sm text-muted-foreground">{colorSaturation}%</span>
                  </div>
                  <Slider id="color-saturation" min={0} max={100} step={5} value={[colorSaturation]} onValueChange={([value]) => setColorSaturation(value)} aria-label="Saturação de cores" />
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="font-medium text-foreground">Leitor de Tela</p>
                  <p className="mt-1 text-sm text-muted-foreground">Labels ARIA foram adicionados aos controles principais deste modal para navegação por voz e tecnologias assistivas.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "language-time" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Idioma e hora</CardTitle>
                <CardDescription>Idioma da interface e formato de hora.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select value={language} onValueChange={(value) => setLanguage(value as typeof language)}>
                    <SelectTrigger aria-label="Idioma">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato de hora</Label>
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Formato de hora">
                    {[
                      ["auto", "Automático"],
                      ["12", "12 horas"],
                      ["24", "24 horas"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={timeFormat === value}
                        onClick={() => setTimeFormat(value as typeof timeFormat)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm transition-colors",
                          timeFormat === value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "plans" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Planos</CardTitle>
                <CardDescription>Plano atual e histórico de transações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="inline-flex rounded-lg border border-border bg-background p-1">
                  <button type="button" onClick={() => setPlansTab("manage")} className={cn("rounded-md px-3 py-2 text-sm", plansTab === "manage" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Gerenciar plano</button>
                  <button type="button" onClick={() => setPlansTab("history")} className={cn("rounded-md px-3 py-2 text-sm", plansTab === "history" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Histórico de transações</button>
                </div>
                {plansTab === "manage" ? (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plano atual</p>
                      <p className="text-xl font-semibold text-foreground">{planLabel}</p>
                    </div>
                    <Button onClick={() => router.push("/dashboard/planos")}>Gerenciar plano</Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">Nenhuma transação encontrada ainda.</div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === "professional" && (
            <PerfilPage />
          )}

          {activeSection === "quotes" && (
            <QuoteBuilderSettings />
          )}

          {activeSection === "community" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Comunidade</CardTitle>
                <CardDescription>Grupos oficiais para networking, feedback e atualizações.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <a href="https://discord.gg/UU8VAqHfvR" target="_blank" rel="noreferrer" className="rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/50">
                  <Users className="mb-3 h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Comunidade no Discord</p>
                  <p className="mt-1 text-sm text-muted-foreground">Networking, avisos e suporte entre editores.</p>
                </a>
                <a href="https://chat.whatsapp.com/Fofp6grErIZEZmSkfc7hHG?mode=hqctcli" target="_blank" rel="noreferrer" className="rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/50">
                  <MessageCircleMore className="mb-3 h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Grupo no WhatsApp</p>
                  <p className="mt-1 text-sm text-muted-foreground">Avisos rápidos e acompanhamento próximo.</p>
                </a>
              </CardContent>
            </Card>
          )}

          {activeSection === "logout" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Sair</CardTitle>
                <CardDescription>Encerrar sua sessão atual na EditUp.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="gap-2" onClick={() => setLogoutDialogOpen(true)}>
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </CardContent>
            </Card>
          )}

        </section>

        <Dialog open={photoPositionDialogOpen} onOpenChange={setPhotoPositionDialogOpen}>
          <DialogContent className="max-w-lg border-border bg-card/95 shadow-2xl backdrop-blur">
            <DialogHeader>
              <DialogTitle>Posicionar foto</DialogTitle>
              <DialogDescription>Ajuste o enquadramento da foto da sua conta.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="mx-auto h-56 w-56 overflow-hidden rounded-xl border border-border bg-background">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Prévia da foto da conta"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${accountPhotoPosition.x}% ${accountPhotoPosition.y}%` }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Sem foto</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Posição horizontal</Label>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[accountPhotoPosition.x]}
                  onValueChange={([x]) => setAccountPhotoPosition((current) => ({ ...current, x }))}
                  aria-label="Posição horizontal da foto"
                />
              </div>
              <div className="space-y-2">
                <Label>Posição vertical</Label>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[accountPhotoPosition.y]}
                  onValueChange={([y]) => setAccountPhotoPosition((current) => ({ ...current, y }))}
                  aria-label="Posição vertical da foto"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="border-border" onClick={() => setAccountPhotoUrl("")}>
                Remover foto
              </Button>
              <Button type="button" onClick={() => setPhotoPositionDialogOpen(false)}>
                Concluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent className="max-w-sm border-border bg-card/95 shadow-2xl backdrop-blur">
            <DialogHeader>
              <DialogTitle>Sair da conta?</DialogTitle>
              <DialogDescription>Você será desconectado desta sessão.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" className="border-border" onClick={() => setLogoutDialogOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => void handleLogout()}>Sair</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
