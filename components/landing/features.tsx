import { Calculator, Package, Video, Users, BriefcaseBusiness, Clock, MonitorPlay } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Calculator,
    title: "Calculadora de Preços",
    description: "Calcule o valor ideal para seus projetos de edição com base em complexidade, prazo e tipo de conteúdo.",
    highlight: true,
  },
  {
    icon: Package,
    title: "Pack de Edição",
    description: "Acesse presets, transições, efeitos sonoros e elementos gráficos prontos para usar nos seus projetos.",
    highlight: true,
  },
  {
    icon: Video,
    title: "Cursos de Edição em Produção",
    description: "Os cursos de edição e prospecção estão em produção para chegar com conteúdo mais completo e atualizado.",
    highlight: false,
  },
  {
    icon: Clock,
    title: "Aulas Semanais",
    description: "Receba conteúdos e acompanhamentos recorrentes para continuar evoluindo no mercado de edição.",
    highlight: false,
  },
  {
    icon: Users,
    title: "Comunidade Exclusiva",
    description: "Troque experiências com outros editores, compartilhe processos e acompanhe novidades em um espaço fechado.",
    highlight: false,
  },
  {
    icon: BriefcaseBusiness,
    title: "Aviso de Vagas",
    description: "Receba acesso à área de vagas para encontrar oportunidades de edição assim que forem publicadas.",
    highlight: false,
  },
  {
    icon: MonitorPlay,
    title: "Página Profissional",
    description: "Monte seu link público com banner, ferramentas, estilos, vídeos e contato principal para fechar clientes.",
    highlight: false,
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Tudo que você precisa para{" "}
            <span className="text-primary">crescer</span>
          </h2>
          <p className="text-muted-foreground">
            Ferramentas e recursos desenvolvidos especificamente para editores de vídeo
            que querem se profissionalizar e aumentar seus ganhos.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className={`border-border bg-card transition-all hover:border-primary/50 ${
                feature.highlight ? "ring-1 ring-primary/20" : ""
              }`}
            >
              <CardHeader>
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
                  feature.highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-foreground">{feature.title}</CardTitle>
                <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
              </CardHeader>
              {feature.highlight && (
                <CardContent>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Incluso no Starter
                  </span>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
