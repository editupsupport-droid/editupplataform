import { BriefcaseBusiness, CircleDollarSign, ClipboardCheck, FolderKanban, MessageSquareText, Package, UserRoundCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
export function Features() {
  const features = [
    {
      icon: CircleDollarSign,
      title: "Orçamentos configuráveis",
      description: "Monte pacotes, adicionais, minutos de vídeo e valores próprios para cada tipo de entrega.",
      highlight: true,
    },
    {
      icon: FolderKanban,
      title: "Produção em Kanban",
      description: "Acompanhe briefing, produção, revisão e aprovação sem perder o contexto do cliente.",
      highlight: true,
    },
    {
      icon: UserRoundCheck,
      title: "CRM 360",
      description: "Veja histórico, faturamento, projetos, Drive vinculado e aprovações ativas de cada cliente.",
      highlight: true,
    },
    {
      icon: ClipboardCheck,
      title: "Portal de aprovação",
      description: "Envie links limpos para o cliente comentar, revisar versões e aprovar a entrega final.",
      highlight: false,
    },
    {
      icon: BriefcaseBusiness,
      title: "Financeiro integrado",
      description: "Transforme orçamento aceito em receita prevista e acompanhe entradas, despesas e saldo.",
      highlight: false,
    },
    {
      icon: Package,
      title: "Pack, Drive e arquivos",
      description: "Centralize recursos, referências e pastas do Google Drive sem espalhar links pelo chat.",
      highlight: false,
    },
    {
      icon: MessageSquareText,
      title: "Exchange e oportunidades",
      description: "Interaja com posts, vagas e recursos da comunidade em um formato mais leve e visual.",
      highlight: false,
    },
  ]

  return (
    <section id="features" className="py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            O essencial para rodar sua operação com{" "}
            <span className="text-primary">clareza</span>
          </h2>
          <p className="text-muted-foreground">
            Recursos escolhidos para deixar a EditUp com cara de produto completo, não de MVP improvisado.
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
