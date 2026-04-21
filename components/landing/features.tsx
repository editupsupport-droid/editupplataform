import { Calculator, Package, Video, Users, BriefcaseBusiness, Clock, MonitorPlay } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
export function Features() {
  const features = [
    {
      icon: Calculator,
      title: "Calculadora de valores",
      description: "Estime uma faixa mais coerente para cada projeto com base em tipo de vídeo, complexidade e prazo.",
      highlight: true,
    },
    {
      icon: Package,
      title: "Pack de edição",
      description: "Tenha presets, transições e recursos prontos para acelerar o trabalho do dia a dia.",
      highlight: true,
    },
    {
      icon: Video,
      title: "Cursos em andamento",
      description: "Conteúdos de edição e prospecção sendo construídos para evoluir junto com a plataforma.",
      highlight: false,
    },
    {
      icon: Clock,
      title: "Aulas e atualizações",
      description: "Aprenda com consistência e acompanhe melhorias práticas de forma recorrente.",
      highlight: false,
    },
    {
      icon: Users,
      title: "Comunidade privada",
      description: "Conecte-se com outros editores, troque referências e acompanhe oportunidades.",
      highlight: false,
    },
    {
      icon: BriefcaseBusiness,
      title: "Área de vagas",
      description: "Veja oportunidades de edição publicadas dentro da plataforma de forma mais organizada.",
      highlight: false,
    },
    {
      icon: MonitorPlay,
      title: "Página profissional",
      description: "Crie um perfil público limpo com banner, vídeos, ferramentas e contato principal.",
      highlight: false,
    },
  ]

  return (
    <section id="features" className="py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            O essencial para trabalhar com mais{" "}
            <span className="text-primary">clareza</span>
          </h2>
          <p className="text-muted-foreground">
            Recursos pensados para o editor que quer crescer com mais estrutura sem perder simplicidade.
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
                    Destaque
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
