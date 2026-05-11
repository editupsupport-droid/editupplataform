import { BellRing, Bot, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardCheck, FolderKanban, Link2, MessageSquareText, Settings2, UserRoundCheck } from "lucide-react"

const actionCards = [
  ["Aprovações", "Link limpo para o cliente assistir, comentar e aprovar."],
  ["Produção", "Kanban para saber o que está pronto, em edição ou revisão."],
  ["Financeiro", "Receita prevista e despesas no mesmo lugar."],
  ["CRM", "Histórico do cliente, projetos e Drive vinculado."],
]

const assistants = [
  ["Propostas", "Crie orçamentos com valores, minutos e adicionais editáveis."],
  ["Perfil público", "Mostre portfólio, contatos e serviços em uma página profissional."],
  ["Exchange", "Recursos, vagas e comunidade em cards menores e rápidos."],
  ["Notificações", "Alertas com contexto para responder e resolver mais rápido."],
]

const consolidate = [
  {
    title: "Simples e poderoso.",
    icon: FolderKanban,
    text: "Centralize clientes, orçamentos e produção sem virar uma planilha gigante.",
  },
  {
    title: "Uma única fonte de informação.",
    icon: UserRoundCheck,
    text: "Cada cliente guarda projetos, aprovações, Drive e faturamento acumulado.",
  },
  {
    title: "Menos acompanhamento. Mais progresso.",
    icon: BellRing,
    text: "Alertas avisam o que precisa de atenção, sem depender de memória.",
  },
  {
    title: "Rastreador de lançamento.",
    icon: ClipboardCheck,
    text: "Veja status, próximos passos e aprovações com leitura rápida.",
  },
]

export function Features() {
  return (
    <section id="features" className="bg-[#f7f7f5] px-5 py-16 text-[#171717] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1080px]">
        <SectionTitle title="Mantenha o trabalho avançando dia e noite." />

        <div className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-[#e5e1dc] bg-[#fff7f1] p-6">
            <p className="text-xs font-black uppercase text-[#7a4a21]">Automatize tarefas</p>
            <h3 className="mt-3 max-w-sm text-2xl font-black leading-tight tracking-[-0.055em]">
              Acompanhe projetos sem perseguir informação.
            </h3>
            <div className="mt-8 space-y-3">
              {["Aprovar orçamento aceito", "Gerar link de aprovação", "Criar card de produção", "Enviar alerta útil"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-bold shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-[#0022fe]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e5e1dc] bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase text-[#555]">Perguntas?</p>
              <Bot className="h-5 w-5 text-[#0022fe]" />
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["Enviar", "Como enviar uma despesa?"],
                ["Cliente", "Detalhes e inscrições estão abertas?"],
                ["Resposta", "Onde está o calendário do projeto?"],
              ].map(([name, text]) => (
                <div key={text} className="rounded-xl border border-[#ece8e2] bg-[#fafafa] p-4">
                  <p className="text-sm font-black tracking-[-0.035em]">{name}</p>
                  <p className="mt-1 text-sm font-medium text-[#666]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actionCards.map(([title, description]) => (
            <MiniCard key={title} title={title} description={description} />
          ))}
        </div>

        <SectionTitle className="mt-16" title="Consulte seus assistentes sob demanda." />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {assistants.map(([title, description], index) => (
            <div key={title} className={`rounded-2xl border border-[#e5e1dc] bg-white p-6 ${index === 0 ? "lg:bg-[#fff2d2]" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase text-[#555]">{title}</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#171717] text-white">
                  {index === 0 ? <CircleDollarSign className="h-4 w-4" /> : index === 1 ? <Link2 className="h-4 w-4" /> : index === 2 ? <MessageSquareText className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-black leading-tight tracking-[-0.055em]">{description}</h3>
              <div className="mt-8 rounded-xl border border-[#ece8e2] bg-[#fafafa] p-4">
                <div className="mb-3 h-3 w-3/4 rounded-full bg-[#d8d4ce]" />
                <div className="mb-3 h-3 w-1/2 rounded-full bg-[#e6e2dc]" />
                <div className="h-24 rounded-lg bg-white shadow-inner" />
              </div>
            </div>
          ))}
        </div>

        <SectionTitle className="mt-16" title="Consolide todo o seu trabalho." />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {consolidate.map((item, index) => (
            <div key={item.title} className={`rounded-2xl border border-[#e5e1dc] p-6 ${index === 1 ? "bg-[#e7f5ff]" : index === 2 ? "bg-white" : index === 3 ? "bg-[#f2e7dc]" : "bg-[#e6fbf6]"}`}>
              <item.icon className="h-6 w-6 text-[#171717]" />
              <h3 className="mt-8 text-2xl font-black leading-tight tracking-[-0.055em]">{item.title}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-[#5f5f5f]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionTitle({ title, className = "" }: { title: string; className?: string }) {
  return (
    <h2 className={`max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.065em] sm:text-5xl ${className}`}>
      {title}
    </h2>
  )
}

function MiniCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[#e5e1dc] bg-white p-5">
      <Settings2 className="h-5 w-5 text-[#0022fe]" />
      <h3 className="mt-5 text-lg font-black tracking-[-0.045em]">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-[#666]">{description}</p>
    </div>
  )
}
