import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

const plans = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    period: "",
    description: "Conta criada, acesso liberado automaticamente para testar a plataforma pela calculadora de valores.",
    features: [
      "Cadastro já entra no plano Free",
      "Acesso somente à calculadora de valores",
      "Upgrade quando quiser",
    ],
    cta: "Criar conta grátis",
    popular: false,
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
    cta: "Começar com Starter",
    popular: false,
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
    cta: "Assinar Essential",
    popular: true,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Planos que cabem no seu{" "}
            <span className="text-primary">bolso</span>
          </h2>
          <p className="text-muted-foreground">
            Escolha o plano ideal para o seu momento e comece a transformar sua carreira de editor.
          </p>
          <p className="mt-3 text-sm font-medium text-primary">
            Garantia de 7 dias para você testar com mais segurança.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative border-border bg-card ${
                plan.popular ? "ring-2 ring-primary" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Mais Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center">
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
                <Link href={`/cadastro?plan=${plan.id}`} className="w-full">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
