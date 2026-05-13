"use client"

import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const plans = [
  {
    id: "free",
    name: "Starter",
    monthly: "R$0",
    annual: "R$0",
    description: "Para organizar o básico sem custo.",
    features: ["Agenda e clientes", "Página profissional", "Marketplace para visualização"],
  },
  {
    id: "essential",
    name: "Essential",
    monthly: "R$60",
    annual: "R$600",
    description: "Melhor custo-benefício para operar com clientes.",
    features: ["Tudo do Starter", "CRM + Financeiro", "Download no Marketplace", "Aprovação sem marca", "Google Drive"],
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: "R$80",
    annual: "R$800",
    description: "Para quem quer benefício premium e escala.",
    features: ["Tudo do Essential", "Creative Cloud", "Logo personalizada", "Marketplace com destaque"],
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="bg-white px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.42 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold text-[#0022fe]">Decisão simples</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#050505] sm:text-5xl">
            Escolha o nível da sua operação.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#6b7280]">
            Comece grátis. Faça upgrade quando precisar baixar recursos, remover marca e controlar o financeiro.
          </p>
        </motion.div>

        <Tabs defaultValue="monthly" className="mt-10 items-center">
          <TabsList className="border border-[#e5e7eb] bg-[#f9fafb]">
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="annual">Anual</TabsTrigger>
          </TabsList>
          {(["monthly", "annual"] as const).map((billing) => (
            <TabsContent key={billing} value={billing} className="mt-8 w-full">
              <div className="grid gap-5 md:grid-cols-3">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border p-6 ${
                      plan.highlighted
                        ? "border-[#0022fe] bg-[#f8faff] shadow-xl shadow-[#0022fe]/10"
                        : "border-[#e5e7eb] bg-white"
                    }`}
                  >
                    {plan.highlighted && (
                      <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-[#0022fe] px-3 py-1 text-xs font-semibold text-white">
                        <Sparkles className="h-3 w-3" />
                        Melhor custo-benefício
                      </span>
                    )}
                    <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#111827]">{plan.name}</h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-[#6b7280]">{plan.description}</p>
                    <div className="mt-6">
                      <span className="text-4xl font-semibold tracking-[-0.02em] text-[#111827]">
                        {billing === "monthly" ? plan.monthly : plan.annual}
                      </span>
                      <span className="text-sm text-[#6b7280]">{plan.id === "free" ? "" : billing === "monthly" ? "/mês" : "/ano"}</span>
                    </div>
                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-[#374151]">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0022fe]" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link href={`/cadastro?plan=${plan.id}`} className="mt-7 block">
                      <Button className={`h-11 w-full rounded-lg ${plan.highlighted ? "bg-[#0022fe] text-white hover:bg-[#001bd1]" : "bg-[#111827] text-white hover:bg-[#0022fe]"}`}>
                        {plan.id === "free" ? "Começar grátis" : "Escalar minha operação"}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
