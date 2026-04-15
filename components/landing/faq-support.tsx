import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const faqItems = [
  {
    question: "O que já fica liberado no plano Free?",
    answer:
      "Toda conta nova entra no Free automaticamente, com acesso à calculadora de valores para começar sem compromisso.",
  },
  {
    question: "O que muda no Starter?",
    answer:
      "O Starter libera pack de edição completo, área de vagas para visualizar oportunidades, página profissional, 100+ presets e efeitos sonoros básicos com acesso vitalício.",
  },
  {
    question: "O que o Essential entrega além do Starter?",
    answer:
      "O Essential adiciona comunidade exclusiva, avisos de novas vagas, aulas semanais, cursos em produção, atualizações mensais, suporte prioritário e certificado.",
  },
  {
    question: "A página profissional já funciona?",
    answer:
      "Sim. Você pode montar seu perfil público com banner, foto, ferramentas, estilos, vídeos e contato principal.",
  },
  {
    question: "Como funcionam as vagas?",
    answer:
      "Usuários Starter para cima podem visualizar as vagas. Os avisos e recursos extras ficam mais completos no Essential.",
  },
  {
    question: "Existe garantia?",
    answer:
      "Sim. A Astherisch oferece garantia de 7 dias para você testar com mais segurança.",
  },
]

export function FaqSupport() {
  return (
    <section className="border-t border-border/50 py-20 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[1.4fr,0.6fr] lg:px-8">
        <div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">FAQ</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Perguntas frequentes sobre os recursos, planos e funcionamento da plataforma.
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
                Se precisar de ajuda com acesso, planos ou suporte ao uso da plataforma:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">E-mail:</span> marinhojose1103@gmail.com
              </p>
              <p>
                <span className="font-medium text-foreground">Número:</span> 81997985738
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
