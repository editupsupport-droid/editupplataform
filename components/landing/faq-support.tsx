"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "A EditUp substitui meu WhatsApp?",
    answer: "Não. Ela organiza o que o WhatsApp não consegue: status, aprovação, arquivos, orçamento e histórico. Você ainda pode conversar com o cliente, mas sem depender do chat como sistema.",
  },
  {
    question: "Consigo começar sem pagar?",
    answer: "Sim. O Starter é gratuito para você organizar o básico, criar clientes, usar agenda e testar a página profissional.",
  },
  {
    question: "O que muda no Essential?",
    answer: "O Essential libera CRM, financeiro, downloads no marketplace, Drive e aprovação sem marca EditUp. É o plano recomendado para operar com clientes reais.",
  },
  {
    question: "O cliente precisa criar conta para aprovar?",
    answer: "Não. Ele acessa um link limpo de aprovação, assiste ao vídeo, comenta por tempo e aprova ou pede ajustes.",
  },
  {
    question: "E se eu atrasar o pagamento?",
    answer: "O acesso pago é controlado pela assinatura. Se o pagamento deixar de ficar ativo, o sistema rebaixa para Starter até a regularização.",
  },
]

export function FaqSupport() {
  return (
    <section id="faq" className="bg-[#f9fafb] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.42 }}
          >
            <p className="text-sm font-semibold text-[#0022fe]">Objeções quebradas</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#050505] sm:text-5xl">
              Dúvidas antes de começar?
            </h2>
            <p className="mt-4 text-base leading-7 text-[#6b7280]">
              Respostas diretas para você decidir sem fricção.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.42, delay: 0.08 }}
            className="rounded-2xl border border-[#e5e7eb] bg-white p-2"
          >
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`item-${index}`} className="border-[#e5e7eb] px-4">
                  <AccordionTrigger className="text-left text-base font-semibold tracking-[-0.02em] text-[#111827] hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-7 text-[#6b7280]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.42 }}
          className="mt-16 rounded-3xl border border-[#1f2937] bg-[#050505] p-8 text-center text-white sm:p-12"
        >
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.02em] sm:text-5xl">
            Pronto para parar de gerenciar cliente no improviso?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/68">
            Crie sua conta grátis e monte sua primeira operação em poucos minutos.
          </p>
          <Link href="/cadastro" className="mt-8 inline-flex">
            <Button className="h-12 rounded-lg bg-[#0022fe] px-6 text-base font-semibold text-white hover:bg-[#2444ff]">
              Começar agora - grátis
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
