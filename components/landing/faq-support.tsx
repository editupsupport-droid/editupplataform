import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function FaqSupport() {
  const faqItems = [
    {
      question: "O que eu libero no plano Free?",
      answer:
        "Toda conta nova começa automaticamente no Free, com acesso imediato à calculadora de valores.",
    },
    {
      question: "O que muda no Starter?",
      answer:
        "O Starter libera o pack de edição, a área de vagas, a página pública e recursos práticos com acesso vitalício.",
    },
    {
      question: "O que o Essential adiciona além do Starter?",
      answer:
        "O Essential adiciona comunidade privada, alertas de vagas, aulas recorrentes, conteúdos em evolução e suporte prioritário.",
    },
    {
      question: "A página profissional já funciona?",
      answer:
        "Sim. Você pode montar um perfil público com banner, foto, ferramentas, estilos, vídeos e seu contato principal.",
    },
    {
      question: "Como funcionam as vagas?",
      answer:
        "Usuários Starter ou acima podem ver vagas. Alertas e recursos extras ficam mais completos no Essential.",
    },
    {
      question: "Tem garantia?",
      answer:
        "Sim. A Astherisch inclui garantia de 7 dias para você testar com mais segurança.",
    },
  ]

  return (
    <section id="faq" className="border-t border-border/50 py-20 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[1.4fr,0.6fr] lg:px-8">
        <div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">Perguntas frequentes</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Respostas rápidas sobre recursos, planos e como a plataforma funciona.
            </p>
          </div>
          <div className="grid gap-4">
            {faqItems.map((item) => (
              <Card key={item.question} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">{item.question}</CardTitle>
                  <CardDescription className="text-muted-foreground">{item.answer}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Card className="sticky top-24 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Suporte</CardTitle>
              <CardDescription className="text-muted-foreground">
                Se você precisar de ajuda com acesso, planos ou uso da plataforma:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Email:</span> editupsupport@gmail.com
              </p>
              <p>
                <span className="font-medium text-foreground">WhatsApp:</span> 81997985738
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
