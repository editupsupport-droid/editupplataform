import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, CircleDollarSign, ClipboardList, MessageSquareText, Play, Sparkles } from "lucide-react"

export function Hero() {
  const columns = [
    {
      title: "Briefing",
      tone: "bg-muted text-muted-foreground",
      items: ["Orçamento novo", "Cliente aguardando"],
    },
    {
      title: "Produção",
      tone: "bg-primary/15 text-primary",
      items: ["Reels V2", "Institucional final"],
    },
    {
      title: "Aprovação",
      tone: "bg-emerald-500/15 text-emerald-300",
      items: ["Link enviado", "Pagamento pendente"],
    },
  ]

  return (
    <section className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/14 blur-[72px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr,1.08fr]">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Workspace premium para editores de vídeo</span>
          </div>

          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Toda a operação do seu estúdio em um único lugar.
          </h1>

          <p className="mb-10 max-w-2xl text-pretty text-lg text-muted-foreground">
            A EditUp une orçamentos, CRM, produção, financeiro, Drive e aprovações em uma interface limpa, rápida e feita para quem trabalha com clientes reais.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/cadastro">
              <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Criar conta grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="gap-2 border-border text-foreground hover:bg-secondary">
                <Play className="h-4 w-4" />
                Ver como funciona
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {["Orçamento configurável", "Kanban de produção", "Portal de aprovação"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[28px] border border-border bg-card/80 p-3 shadow-2xl shadow-primary/10">
            <div className="rounded-2xl border border-border bg-background/95">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">EditUp Studio</p>
                    <p className="text-xs text-muted-foreground">Painel de produção</p>
                  </div>
                </div>
                <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Hoje</div>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {columns.map((column) => (
                  <div key={column.title} className="rounded-2xl border border-border bg-card/70 p-3">
                    <div className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${column.tone}`}>
                      {column.title}
                    </div>
                    <div className="space-y-2">
                      {column.items.map((item) => (
                        <div key={item} className="rounded-xl border border-border bg-background/80 p-3">
                          <p className="text-sm font-medium text-foreground">{item}</p>
                          <div className="mt-3 h-1.5 rounded-full bg-secondary">
                            <div className="h-1.5 w-2/3 rounded-full bg-primary" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <CircleDollarSign className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground">Receita prevista</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">R$ 4.280</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <ClipboardList className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground">Projetos ativos</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">12</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <MessageSquareText className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground">Aprovações</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">5</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="mt-20 grid gap-4 border-t border-border/50 pt-12 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/70 p-5 text-center">
            <div className="text-sm font-semibold text-foreground">Propostas mais profissionais</div>
            <div className="mt-2 text-sm text-muted-foreground">Configure pacotes, adicionais e links para vender com mais clareza.</div>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5 text-center">
            <div className="text-sm font-semibold text-foreground">Produção com contexto</div>
            <div className="mt-2 text-sm text-muted-foreground">Cada cliente, entrega, arquivo e aprovação aparece no lugar certo.</div>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5 text-center">
            <div className="text-sm font-semibold text-foreground">Experiência de agência</div>
            <div className="mt-2 text-sm text-muted-foreground">Portal de aprovação, CRM e financeiro para parecer maior sem complicar.</div>
          </div>
        </div>
      </div>
    </section>
  )
}
