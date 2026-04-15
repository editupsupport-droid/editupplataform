"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator, Package, Video, Instagram, ArrowRight, Crown, TrendingUp, Users, Smile, MessageCircleMore } from "lucide-react"
import { PLAN_LABELS } from "@/lib/app-data"
import { useAppSession } from "@/components/app/app-provider"

const quickActions = [
  {
    title: "Calculadora de Preços",
    description: "Calcule o valor ideal para seus projetos",
    icon: Calculator,
    href: "/dashboard/calculadora",
    color: "bg-primary",
  },
  {
    title: "Pack de Edição",
    description: "Baixe presets e recursos de edição",
    icon: Package,
    href: "/dashboard/pack",
    color: "bg-chart-2",
  },
  {
    title: "Curso de Reels",
    description: "Aprenda a criar Reels que viralizam",
    icon: Video,
    href: "/dashboard/curso-reels",
    color: "bg-chart-3",
    locked: true,
  },
  {
    title: "Prospecção no Instagram",
    description: "Conquiste clientes pelo Instagram",
    icon: Instagram,
    href: "/dashboard/prospeccao",
    color: "bg-chart-4",
    locked: true,
  },
]

const stats = [
  {
    title: "Editores ativos",
    value: "+28",
    change: "Comunidade em crescimento",
    icon: Users,
  },
  {
    title: "Presets inclusos",
    value: "+100",
    change: "Entre presets, vídeos e efeitos",
    icon: TrendingUp,
  },
  {
    title: "Satisfação",
    value: "82%",
    change: "Base atual de usuários",
    icon: Smile,
  },
]

export default function DashboardPage() {
  const { currentUser } = useAppSession()

  if (!currentUser) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Bem-vindo de volta!
        </h1>
        <p className="mt-1 text-muted-foreground">
          Aqui está um resumo da sua atividade e acesso rápido às ferramentas.
        </p>
      </div>

      {/* Plan Banner */}
      <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Plano {PLAN_LABELS[currentUser.plan]}</h3>
              <p className="text-sm text-muted-foreground">
                {currentUser.plan === "free"
                  ? "Você já tem a calculadora liberada e pode escolher seu plano quando quiser."
                  : currentUser.plan === "starter"
                    ? "Você já pode acessar pack, perfil público e área de vagas."
                    : "Seu plano Essential já libera todos os recursos atuais da plataforma."}
              </p>
            </div>
          </div>
          <Link href="/dashboard/planos">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              {currentUser.plan === "essential" ? "Gerenciar plano" : "Ver Planos"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Acesso Rápido</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="group h-full cursor-pointer border-border bg-card transition-all hover:border-primary/50">
                <CardHeader>
                  <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    {action.title}
                    {action.locked && (
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        Em produção
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="inline-flex items-center text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Acessar <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Comunidade Exclusiva</CardTitle>
          <CardDescription className="text-muted-foreground">
            Entre nos grupos exclusivos para networking, suporte e oportunidades.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="https://discord.gg/P4x7DKEGnJ" target="_blank">
            <Button variant="outline" className="border-border">
              <MessageCircleMore className="mr-2 h-4 w-4" />
              Comunidade Discord
            </Button>
          </Link>
          <Link href="https://chat.whatsapp.com/GCyIOZBGhYKAJ6sLvpYEUf?mode=gi_t" target="_blank">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Grupo WhatsApp
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Atividade Recente</CardTitle>
          <CardDescription className="text-muted-foreground">
            Suas últimas ações na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: "Calculou preço de projeto", time: "Há 2 horas", type: "calculator" },
              { action: "Baixou preset de transições", time: "Há 5 horas", type: "download" },
              { action: "Atualizou perfil profissional", time: "Ontem", type: "profile" },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 rounded-lg bg-secondary/50 p-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
