"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Crown, MessageCircleMore, Sparkles } from "lucide-react"
import { useState } from "react"
import { PLAN_LABELS, PlanId } from "@/lib/app-data"
import { useAppSession } from "@/components/app/app-provider"

const plans = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    period: "",
    description: "Plano automático para toda conta nova, com foco total na calculadora de valores.",
    features: [
      "Cadastro já entra no plano Free",
      "Acesso somente à calculadora de valores",
      "Upgrade quando quiser",
    ],
    current: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "R$ 20",
    period: "único",
    description: "Perfeito para quem está começando e quer organizar seus preços e ter recursos de qualidade.",
    features: [
      "Calculadora de preços de vídeo",
      "Pack de edição completo",
      "Área de vagas para visualizar oportunidades",
      "Página profissional pública",
      "100+ presets e transições",
      "Efeitos sonoros básicos",
      "Acesso vitalício",
    ],
    current: false,
  },
  {
    id: "essential",
    name: "Essential",
    price: "R$ 80",
    period: "/mês",
    description: "Para editores que querem dominar o mercado e escalar seus resultados.",
    features: [
      "Tudo do plano Starter",
      "Comunidade exclusiva",
      "Avisos de novas vagas",
      "Aulas semanais",
      "Cursos de edição em produção",
      "Atualizações mensais de conteúdo",
      "Suporte prioritário",
      "Certificado de conclusão",
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
    setSelectedPlan(planId)

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan: planId,
        email: currentUser.email,
        userId: currentUser.id,
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
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Planos e Assinatura</h1>
        <p className="mt-1 text-muted-foreground">
          Escolha o plano ideal para sua carreira de editor
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
            <h3 className="font-semibold text-foreground">Seu plano atual: {PLAN_LABELS[currentUser.plan]}</h3>
            <p className="text-sm text-muted-foreground">
              {currentUser.plan === "free"
                ? "Sua conta entrou automaticamente no plano Free com acesso à calculadora."
                : currentUser.plan === "starter"
                  ? "Você já tem calculadora, pack, perfil público e área de vagas."
                  : "Você já tem acesso às vantagens do Starter, comunidade exclusiva e aviso de vagas."}
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
                  Plano Atual
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
                        ? "Comprar com cartão"
                        : "Comprar com cartão"}
                  </Button>
                  {plan.id !== "free" && (
                    <Link href="https://wa.me/5581997985738" target="_blank" className="block">
                      <Button variant="outline" className="w-full border-border">
                        <MessageCircleMore className="mr-2 h-4 w-4" />
                        Comprar com Pix
                      </Button>
                    </Link>
                  )}
                  {plan.id !== "free" && (
                    <p className="text-center text-xs text-muted-foreground">
                      Escolha se quer comprar com cartão ou Pix.
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
            Se precisar de ajuda com pagamento, plano ou acesso, fale diretamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>E-mail: marinhojose1103@gmail.com</p>
          <p>Telefone: 5581997985738</p>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            {
              question: "Posso cancelar a qualquer momento?",
              answer: "Sim! O plano Essential pode ser cancelado a qualquer momento. Você manterá acesso até o final do período pago.",
            },
            {
              question: "Toda conta começa no plano Free?",
              answer: "Sim. Quem cria conta entra automaticamente no plano Free e já pode usar a calculadora de valores.",
            },
            {
              question: "Quem pode ver as vagas?",
              answer: "A área de vagas fica disponível para usuários do Starter para cima. A publicação é restrita aos e-mails autorizados.",
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
