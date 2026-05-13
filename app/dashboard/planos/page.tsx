"use client"

import Link from "next/link"
import { useState } from "react"
import { Check, Crown, MessageCircleMore, ShieldCheck, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PLAN_LABELS, PlanId, planMeets } from "@/lib/app-data"
import { useAppSession } from "@/components/app/app-provider"
import { authFetch } from "@/lib/supabase"

const plans: Array<{
  id: PlanId
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
  pro?: boolean
}> = [
  {
    id: "free",
    name: "Starter",
    price: "R$ 0",
    period: "",
    description: "Para começar com agenda, clientes e página profissional sem custo.",
    features: [
      "Agenda e clientes",
      "Página profissional",
      "Aprovação com marca EditUp",
      "Marketplace apenas visualização",
    ],
  },
  {
    id: "essential",
    name: "Essential",
    price: "R$ 60",
    period: "/mês",
    description: "Para operar como profissional com CRM, financeiro e downloads liberados.",
    features: [
      "Tudo do Starter",
      "Aprovação sem marca d'água",
      "Download no Marketplace",
      "Financeiro e CRM liberados",
      "Drive e links de aprovação",
    ],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 80",
    period: "/mês",
    description: "Para quem quer benefício externo e controle premium de licença.",
    features: [
      "Tudo do Essential",
      "Customização de logo na aprovação",
      "Marketplace com destaque",
      "Relatórios avançados",
      "Resgate da Creative Cloud",
    ],
    pro: true,
  },
]

export default function PlanosPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const { currentUser } = useAppSession()

  if (!currentUser) return null

  const handlePlanChange = async (planId: PlanId) => {
    if (planId === "free" || planId === currentUser.plan) return
    if (planMeets(currentUser.plan, planId)) {
      setMessage("Esse plano já está liberado para sua conta.")
      return
    }

    setSelectedPlan(planId)
    setMessage("")

    const response = await authFetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan: planId,
      }),
    })

    const data = (await response.json()) as { url?: string; error?: string }

    if (!response.ok || !data.url) {
      setMessage(data.error ?? "Não foi possível iniciar o checkout.")
      setSelectedPlan(null)
      return
    }

    window.location.href = data.url
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Planos e cobrança</h1>
        <p className="mt-1 text-muted-foreground">Controle de acesso por tiers para a sua operação de edição.</p>
        {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
      </div>

      <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Plano atual: {PLAN_LABELS[currentUser.plan]}</h3>
            <p className="text-sm text-muted-foreground">
              Status da assinatura: {currentUser.subscriptionStatus === "active" ? "ativa" : currentUser.subscriptionStatus ?? "sem assinatura ativa"}.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative border-border bg-card transition-all ${
              plan.popular ? "ring-2 ring-primary" : ""
            } ${plan.pro ? "bg-[radial-gradient(circle_at_top_right,rgba(0,34,254,0.14),transparent_35%),var(--card)]" : ""} ${selectedPlan === plan.id ? "border-primary" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  Recomendado
                </span>
              </div>
            )}
            {plan.pro && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 rounded-full bg-[#0022fe] px-4 py-1 text-xs font-semibold text-white">
                  <ShieldCheck className="h-3 w-3" />
                  Licença Pro
                </span>
              </div>
            )}
            {currentUser.plan === plan.id && (
              <div className="absolute -top-3 right-4">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">Plano atual</span>
              </div>
            )}
            <CardHeader className="pt-8">
              <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
              <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {currentUser.plan === plan.id ? (
                <Button className="w-full" variant="outline" disabled>Plano atual</Button>
              ) : plan.id === "free" ? (
                <Button className="w-full" variant="outline" disabled>Incluído na conta</Button>
              ) : (
                <div className="w-full space-y-2">
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handlePlanChange(plan.id)}
                    disabled={selectedPlan === plan.id}
                  >
                    {selectedPlan === plan.id ? "Abrindo checkout..." : `Assinar ${plan.name}`}
                  </Button>
                  <Link href="https://wa.me/5581997985738" target="_blank" className="block">
                    <Button variant="outline" className="w-full border-border">
                      <MessageCircleMore className="mr-2 h-4 w-4" />
                      Pagar com Pix
                    </Button>
                  </Link>
                </div>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Regras automáticas</CardTitle>
          <CardDescription className="text-muted-foreground">O acesso é liberado pelo webhook de pagamento e rebaixado para Starter se a assinatura deixar de ficar ativa.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
