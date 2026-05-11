import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "R$25,00",
    period: "/pgt único",
    features: ["Calculadora de valor de vídeos", "Pack de edição de vídeos", "Acesso vitalício"],
  },
  {
    id: "essential",
    name: "Essential",
    price: "R$80,00",
    period: "/mês",
    features: [
      "Todos recursos do status",
      "Comunidade privada",
      "Alertas de vagas de edição",
      "CRM, Produção, Orçamentos e financeiro.",
      "Link de aprovação de clientes",
      "Integração com google drive.",
    ],
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="bg-white px-5 py-16 text-[#171717] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.065em] sm:text-5xl">
          Mais produtividade. Menos ferramentas.
        </h2>

        <div className="mt-8 rounded-2xl border border-[#e5e1dc] bg-[#fbfbfa] p-6">
          <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-sm font-black">Organize toda sua operação em um só lugar.</p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#666]">
                Menos troca de ferramenta, menos link perdido e mais contexto para entregar melhor.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <SmallStat label="Ferramentas a menos" value="10" />
                <SmallStat label="Economia estimada" value="US$ 340" />
                <SmallStat label="Tempo recuperado" value="12h" />
                <SmallStat label="Receita rastreada" value="R$ 4.080" />
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e1dc] bg-white p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "CRM",
                  "Kanban",
                  "Orçamentos",
                  "Drive",
                  "Aprovação",
                  "Financeiro",
                  "Perfil",
                  "Exchange",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-xl bg-[#f6f5f2] p-3 text-sm font-bold">
                    <Check className="h-4 w-4 text-[#0022fe]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-[24px] border-2 border-[#00195f] bg-[#edf5ff] px-7 py-8 text-[#010b44] sm:px-10 lg:px-12 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            {plans.map((plan) => (
              <div key={plan.name}>
                <h3 className="text-4xl font-black tracking-[-0.06em] sm:text-5xl">{plan.name}</h3>
                <div className="mt-6 flex flex-wrap items-end gap-x-2">
                  <span className="text-5xl font-black leading-none tracking-[-0.07em] sm:text-6xl">{plan.price}</span>
                  <span className="pb-1.5 text-2xl font-medium tracking-[-0.05em] text-[#010b44]">{plan.period}</span>
                </div>

                <ul className="mt-10 space-y-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-lg font-semibold leading-tight tracking-[-0.045em]">
                      <Check className="mt-0.5 h-6 w-6 shrink-0 stroke-[4]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={`/cadastro?plan=${plan.id}`} className="mt-9 inline-flex">
                  <Button className="h-12 rounded-xl bg-[#00195f] px-6 text-sm font-bold text-white hover:bg-[#0022fe]">
                    Começar com {plan.name}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e5e1dc] bg-white p-4">
      <p className="text-xs font-bold text-[#666]">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.06em]">{value}</p>
    </div>
  )
}
