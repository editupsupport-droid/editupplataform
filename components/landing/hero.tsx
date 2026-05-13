"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

const trustItems = ["+500 editores organizados", "CRM", "Orçamentos", "Produção", "Drive", "Aprovação"]

export function Hero() {
  return (
    <section className="overflow-hidden border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 lg:pb-20 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-xs font-medium text-[#374151]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#0022fe]" />
            O fim do caos entre WhatsApp, Drive e planilhas
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.02em] text-[#050505] sm:text-6xl">
            Organize sua operação de edição e entregue como uma agência.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-8 text-[#4b5563]">
            A EditUp transforma orçamento, cliente, produção, aprovação e financeiro em um único fluxo. Sem perder pedido no chat. Sem link solto. Sem retrabalho invisível.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/cadastro">
              <Button className="h-12 rounded-lg bg-[#0022fe] px-6 text-base font-semibold text-white hover:bg-[#001bd1]">
                Começar agora - grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-sm text-[#6b7280]">Leva menos de 2 minutos. Sem cartão.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
          className="relative mx-auto mt-12 max-w-5xl"
        >
          <div className="absolute -left-8 top-12 hidden rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm md:block">
            Aprovação pronta
          </div>
          <div className="absolute -right-8 bottom-16 hidden rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm md:block">
            Receita registrada
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#1f2937] bg-[#111827] shadow-2xl shadow-[#111827]/18">
            <img src="/landing-workspace.png" alt="Workspace EditUp para organizar projetos de edição" className="block w-full" />
          </div>
        </motion.div>

        <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y border-[#e5e7eb] py-5 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
          {trustItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
