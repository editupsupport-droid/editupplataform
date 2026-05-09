"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Crown, MessageCircleMore, Sparkles } from "lucide-react"
import { useState } from "react"
import { PLAN_LABELS, PlanId } from "@/lib/app-data"
import { useAppSession } from "@/components/app/app-provider"
import { authFetch } from "@/lib/supabase"

const plans = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    period: "",
    description: "Plano padrão para toda conta nova, com foco na calculadora de propostas.",
    features: [
      "Toda conta nova começa no Free",
      "Acesso à calculadora de propostas",
      "Upgrade a qualquer momento",
    ],
    current: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "R$ 20",
    period: "pagamento único",
    description: "Ideal para quem quer começar com o essencial e ter acesso prático sem complexidade.",
    features: [
      "Calculadora de propostas",
      "Pack completo de edição",
      "Página profissional",
      "Área de oportunidades",
      "Acesso aos recursos essenciais",
      "Entrada simples e direta",
      "Acesso vitalício",
    ],
    current: false,
  },
  {
    id: "essential",
    name: "Essential",
    price: "R$ 80",
    period: "/mês",
    description: "Para quem quer acesso total à plataforma, mais estrutura e mais recursos no dia a dia.",
    features: [
      "Tudo do Starter",
      "CRM, Produção, Orçamentos e Financeiro",
      "Links de aprovação para clientes",
      "Integração com Google Drive",
      "Comunidade privada",
      "Alertas de novas vagas",
      "Suporte prioritário",
    ],
    popular: true,
    current: false,
  },
]

export default function PlanosPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const { currentUser } = useAppSession()

  if (!currentUser) return null

  const handlePlanChange = async (planId: PlanId) => {
    if (planId === currentUser.plan || planId === "free") return
    if (currentUser.plan === "essential" && planId === "starter") {
      setMessage("Quem já está no Essential não pode comprar o Starter por ser um plano inferior.")
      return
    }
    setSelectedPlan(planId)

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
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Planos e cobrança</h1>
        <p className="mt-1 text-muted-foreground">
          Escolha o plano certo para o seu momento como editor
        </p>
        {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
      </div>

      {/* Current Plan Info */}
      <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Plano atual: {PLAN_LABELS[currentUser.plan]}</h3>
            <p className="text-sm text-muted-foreground">
              {currentUser.plan === "free"
                ? "Sua conta começou automaticamente no Free com acesso à calculadora."
                : currentUser.plan === "starter"
                  ? "Você já tem acesso à calculadora de propostas, ao pack de edição e aos recursos essenciais."
                  : "Você já tem acesso total à plataforma, comunidade privada, aprovações, CRM, produção e financeiro."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative border-border bg-card transition-all ${
              plan.popular ? "ring-2 ring-primary" : ""
            } ${selectedPlan === plan.id ? "border-primary" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  Recomendado
                </span>
              </div>
            )}
            {currentUser.plan === plan.id && (
              <div className="absolute -top-3 right-4">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                  Plano atual
                </span>
              </div>
            )}
            <CardHeader className="text-center pt-8">
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
                  <li key={feature} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {currentUser.plan === plan.id ? (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled
                >
                  Plano atual
                </Button>
              ) : currentUser.plan === "essential" && plan.id === "starter" ? (
                <Button className="w-full" variant="outline" disabled>
                  Plano inferior indisponível
                </Button>
              ) : (
                <div className="w-full space-y-2">
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handlePlanChange(plan.id as PlanId)}
                  >
                    {plan.id === "free"
                      ? "Começar no Free"
                      : currentUser.plan === "free" && plan.id === "starter"
                        ? "Pagar com cartão"
                        : "Pagar com cartão"}
                  </Button>
                  {plan.id !== "free" && (
                    <Link href="https://wa.me/5581997985738" target="_blank" className="block">
                      <Button variant="outline" className="w-full border-border">
                        <MessageCircleMore className="mr-2 h-4 w-4" />
                        Pagar com Pix
                      </Button>
                    </Link>
                  )}
                  {plan.id !== "free" && (
                    <p className="text-center text-xs text-muted-foreground">
                      Escolha se prefere pagar com cartão ou Pix.
                    </p>
                  )}
                </div>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Suporte</CardTitle>
          <CardDescription className="text-muted-foreground">
            Se precisar de ajuda com pagamento, acesso ou planos, fale diretamente com o suporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Email: editupsupport@gmail.com</p>
          <p>Telefone: 5581997985738</p>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Perguntas frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            {
              question: "Posso cancelar a qualquer momento?",
              answer: "Sim. O plano Essential pode ser cancelado a qualquer momento, e o acesso continua até o fim do período pago.",
            },
            {
              question: "Toda conta começa no Free?",
              answer: "Sim. Toda conta nova começa automaticamente no Free e já pode usar a calculadora de valores.",
            },
            {
              question: "O que o Starter libera?",
              answer: "O Starter libera somente a calculadora de valores e o pack de edição. Todo o restante fica no Essential.",
            },
          ].map((faq, index) => (
            <div key={index}>
              <h4 className="font-medium text-foreground">{faq.question}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
