"use client"

import { AlertTriangle, ArrowRight, CheckCircle2, CircleDollarSign, Clock3, FolderKanban, Link2, MessageCircle, ShieldCheck, UserRoundCheck, Wallet } from "lucide-react"
import { motion } from "framer-motion"

const features = [
  { title: "CRM de Clientes", description: "Histórico, contatos, Drive e projetos em um só perfil.", icon: UserRoundCheck, className: "md:col-span-1" },
  { title: "Kanban de Produção", description: "Do briefing à aprovação, cada entrega tem status claro.", icon: FolderKanban, className: "md:col-span-1" },
  { title: "Links de Aprovação", description: "Cliente revisa, comenta por tempo e aprova sem bagunça.", icon: Link2, className: "md:col-span-2" },
  { title: "Financeiro Integrado", description: "Orçamentos aceitos viram receita prevista automaticamente.", icon: Wallet, className: "md:col-span-1" },
  { title: "Marketplace Controlado", description: "Visualização no Starter, downloads para planos pagos.", icon: ShieldCheck, className: "md:col-span-1" },
]

const testimonials = [
  {
    name: "Murilo Santos",
    role: "Editor de Reels",
    text: "Parecia que eu trabalhava em cinco lugares ao mesmo tempo. Agora sei exatamente qual cliente está em produção, revisão e pagamento.",
    avatar: "MS",
  },
  {
    name: "Luma HQ",
    role: "Social video editor",
    text: "O link de aprovação mudou o jogo. O cliente comenta no ponto certo do vídeo e eu paro de caçar ajuste no WhatsApp.",
    avatar: "LH",
  },
  {
    name: "Beto Shorts",
    role: "Criador de conteúdo",
    text: "A entrega ficou mais profissional. Eu vejo projeto, prazo e aprovação sem precisar perguntar toda hora.",
    avatar: "BS",
  },
]

export function Features() {
  return (
    <>
      <section id="pain" className="bg-[#f9fafb] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-[#0022fe]">Antes vs Depois</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#050505] sm:text-5xl">
                Saia do improviso e entre no controle.
              </h2>
            </div>
          </FadeUp>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <FadeUp>
              <div className="h-full rounded-2xl border border-[#e5e7eb] bg-white p-6">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#111827]">Antes: tudo espalhado</h3>
                <div className="mt-6 space-y-3">
                  {["Ajuste perdido no WhatsApp", "Link de Drive sem contexto", "Cliente sem histórico", "Orçamento sem virar projeto", "Receita prevista na cabeça"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-[#f3f4f6] bg-[#fafafa] p-3 text-sm text-[#4b5563]">
                      <MessageCircle className="h-4 w-4 text-red-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.08}>
              <div className="h-full rounded-2xl border border-[#dbe3ff] bg-white p-6 shadow-sm">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#0022fe]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#111827]">Depois: operação centralizada</h3>
                <div className="mt-6 space-y-3">
                  {["Cliente cadastrado no CRM", "Projeto criado no Kanban", "Aprovação com link profissional", "Receita prevista registrada", "Próximo passo visível"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-[#eef2ff] bg-[#f8faff] p-3 text-sm font-medium text-[#111827]">
                      <ArrowRight className="h-4 w-4 text-[#0022fe]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-[#0022fe]">Bento Grid</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#050505] sm:text-5xl">
                Tudo que empurra o cliente para a aprovação.
              </h2>
            </div>
          </FadeUp>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {features.map((feature, index) => (
              <FadeUp key={feature.title} delay={index * 0.04}>
                <div className={`h-full rounded-2xl border border-[#e5e7eb] bg-[#fbfbfb] p-6 ${feature.className}`}>
                  <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[#111827]">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#111827]">{feature.title}</h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-[#6b7280]">{feature.description}</p>
                  {feature.title === "Links de Aprovação" && (
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {["V1", "V2", "Final"].map((version) => (
                        <div key={version} className="rounded-xl border border-[#e5e7eb] bg-white p-3 text-sm font-semibold text-[#111827]">
                          {version}
                          <p className="mt-1 text-xs font-normal text-[#6b7280]">comentários por tempo</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="bg-[#f9fafb] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-[#0022fe]">Prova social</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#050505] sm:text-5xl">
                Criado para quem entrega vídeo com cliente real.
              </h2>
            </div>
          </FadeUp>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {testimonials.map((item, index) => (
              <FadeUp key={item.name} delay={index * 0.06}>
                <article className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
                  <p className="text-sm leading-7 text-[#374151]">“{item.text}”</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">
                      {item.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
                      <p className="text-xs text-[#6b7280]">{item.role}</p>
                    </div>
                  </div>
                </article>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  )
}
