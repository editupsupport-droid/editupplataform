import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-[128px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">Plataforma para Editores de Vídeo</span>
          </div>

          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Eleve a qualidade dos seus{" "}
            <span className="text-primary">vídeos</span> e organize sua carreira
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg text-muted-foreground">
            Ferramentas profissionais para editores: calculadora de preços, packs de edição exclusivos
            e recursos para dominar o mercado com página profissional, aulas semanais e comunidade.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/cadastro">
              <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Começar Gratuitamente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="gap-2 border-border text-foreground hover:bg-secondary">
                <Play className="h-4 w-4" />
                Ver Recursos
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border/50 pt-12 md:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">+28</div>
            <div className="mt-1 text-sm text-muted-foreground">Editores ativos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">+100</div>
            <div className="mt-1 text-sm text-muted-foreground">Presets inclusos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">Semanal</div>
            <div className="mt-1 text-sm text-muted-foreground">Aulas e atualizações</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">82%</div>
            <div className="mt-1 text-sm text-muted-foreground">Satisfação</div>
          </div>
        </div>
      </div>
    </section>
  )
}
