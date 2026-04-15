"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Bell, Lock, Trash2, MessageSquare, Clock } from "lucide-react"

export default function ConfiguracoesPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    updates: true,
    marketing: false,
  })
  const [whatsappNotifications, setWhatsappNotifications] = useState({
    enabled: true,
    antecedencia: "30",
    numero: "",
  })

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Configurações</h1>
        <p className="mt-1 text-muted-foreground">
          Gerencie suas preferências de conta e notificações
        </p>
      </div>

      {/* Account Info */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Lock className="h-5 w-5" />
            Informações da Conta
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Atualize suas informações de login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">E-mail</Label>
            <Input
              id="email"
              type="email"
              defaultValue="editor@email.com"
              className="border-border bg-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-foreground">Senha atual</Label>
            <Input
              id="current-password"
              type="password"
              placeholder="Digite sua senha atual"
              className="border-border bg-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-foreground">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Digite a nova senha"
                className="border-border bg-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-foreground">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirme a nova senha"
                className="border-border bg-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Notifications for Agenda */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
            Notificações da Agenda via WhatsApp
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Receba lembretes de prazos de entrega pelo WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">Ativar notificações WhatsApp</Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas quando o prazo de entrega estiver próximo
              </p>
            </div>
            <Switch
              checked={whatsappNotifications.enabled}
              onCheckedChange={(checked) =>
                setWhatsappNotifications({ ...whatsappNotifications, enabled: checked })
              }
            />
          </div>

          {whatsappNotifications.enabled && (
            <>
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Antecipar aviso em
                </Label>
                <Select
                  value={whatsappNotifications.antecedencia}
                  onValueChange={(value) =>
                    setWhatsappNotifications({ ...whatsappNotifications, antecedencia: value })
                  }
                >
                  <SelectTrigger className="border-border bg-input text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="15">15 minutos antes</SelectItem>
                    <SelectItem value="30">30 minutos antes</SelectItem>
                    <SelectItem value="60">1 hora antes</SelectItem>
                    <SelectItem value="120">2 horas antes</SelectItem>
                    <SelectItem value="180">3 horas antes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Você será notificado com essa antecedência antes do prazo de cada tarefa
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-number" className="text-foreground">
                  Número do WhatsApp
                </Label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 rounded-md border border-border bg-muted">
                    <span>🇧🇷</span>
                    <span className="text-muted-foreground">+55</span>
                  </div>
                  <Input
                    id="whatsapp-number"
                    type="tel"
                    placeholder="11999887766"
                    value={whatsappNotifications.numero}
                    onChange={(e) =>
                      setWhatsappNotifications({
                        ...whatsappNotifications,
                        numero: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="flex-1 border-border bg-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5" />
            Notificações por E-mail
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Escolha quais notificações você deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">Notificações por e-mail</Label>
              <p className="text-sm text-muted-foreground">
                Receba avisos importantes sobre sua conta
              </p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, email: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">Atualizações de conteúdo</Label>
              <p className="text-sm text-muted-foreground">
                Saiba quando novos presets ou aulas são adicionados
              </p>
            </div>
            <Switch
              checked={notifications.updates}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, updates: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">E-mails de marketing</Label>
              <p className="text-sm text-muted-foreground">
                Receba dicas, promoções e novidades
              </p>
            </div>
            <Switch
              checked={notifications.marketing}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, marketing: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Ações irreversíveis para sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Excluir conta</p>
              <p className="text-sm text-muted-foreground">
                Todos os seus dados serão permanentemente removidos
              </p>
            </div>
            <Button variant="destructive">Excluir Conta</Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSaving ? (
            "Salvando..."
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
