import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/14 blur-[72px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Plataforma para editores de vídeo</span>
          </div>

          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Melhore seus{" "}
            <span className="text-primary">vídeos</span>{" "}
            e organize sua carreira.
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg text-muted-foreground">
            Ferramentas profissionais para quem quer cobrar melhor, organizar o trabalho e crescer como editor com mais clareza.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
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
        </div>

        <div className="mt-20 grid gap-4 border-t border-border/50 pt-12 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/70 p-5 text-center">
            <div className="text-sm font-semibold text-foreground">Calcule seu valor</div>
            <div className="mt-2 text-sm text-muted-foreground">Use uma faixa mais coerente para cada projeto e moeda.</div>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5 text-center">
            <div className="text-sm font-semibold text-foreground">Organize clientes e entregas</div>
            <div className="mt-2 text-sm text-muted-foreground">Tenha uma visão clara do que está em produção e do que falta responder.</div>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5 text-center">
            <div className="text-sm font-semibold text-foreground">Mostre seu perfil profissional</div>
            <div className="mt-2 text-sm text-muted-foreground">Crie uma página pública limpa para passar mais confiança ao cliente.</div>
          </div>
        </div>
      </div>
    </section>
  )
}
