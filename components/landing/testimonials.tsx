import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Lucas Oliveira",
    role: "Editor Freelancer",
    content: "A calculadora de preços mudou minha vida! Antes eu não sabia quanto cobrar, agora tenho certeza que estou precificando corretamente.",
    rating: 5,
  },
  {
    name: "Mariana Costa",
    role: "Criadora de Conteúdo",
    content: "Os presets do pack são incríveis! Consegui dobrar minha velocidade de edição e a qualidade dos meus vídeos melhorou muito.",
    rating: 5,
  },
  {
    name: "Rafael Santos",
    role: "Editor de Reels",
    content: "O curso de prospecção no Instagram foi um divisor de águas. Em 2 meses consegui 15 novos clientes fixos.",
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="border-t border-border/50 bg-card/50 py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            O que nossos{" "}
            <span className="text-primary">editores</span> dizem
          </h2>
          <p className="text-muted-foreground">
            Veja como a Astherisch está transformando a carreira de editores em todo o Brasil.
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
