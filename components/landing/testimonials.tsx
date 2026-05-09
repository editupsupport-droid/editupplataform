import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
export function Testimonials() {
  const testimonials = [
    {
      name: "Lucas Oliveira",
      role: "Editor freelancer",
      content: "A calculadora mudou a forma como eu monto proposta. Parei de chutar valor e comecei a apresentar escopo.",
      rating: 5,
    },
    {
      name: "Mariana Costa",
      role: "Criadora de conteúdo",
      content: "O fluxo de cliente, produção e aprovação deixou meu trabalho com cara de agência, mesmo sendo solo.",
      rating: 5,
    },
    {
      name: "Rafael Santos",
      role: "Editor de Reels",
      content: "Consigo acompanhar orçamentos, links e entregas sem espalhar tudo em planilha, WhatsApp e notas soltas.",
      rating: 5,
    },
  ]

  return (
    <section id="testimonials" className="border-t border-border/50 bg-card/50 py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Feito para editores que querem{" "}
            <span className="text-primary">operar melhor</span>
          </h2>
          <p className="text-muted-foreground">
            A EditUp organiza a parte invisível do trabalho: proposta, cliente, produção, aprovação e recebimento.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="mb-6 text-muted-foreground">{`"${testimonial.content}"`}</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <span className="text-sm font-semibold text-primary">
                      {testimonial.name.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
