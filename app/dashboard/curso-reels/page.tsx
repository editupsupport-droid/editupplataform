import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, Play, Clock, BookOpen, ArrowRight, Crown } from "lucide-react"

const modules = [
  {
    id: 1,
    title: "Fundamentos da edição de reels",
    description: "Aprenda os conceitos centrais e as melhores escolhas de estrutura",
    lessons: 5,
    duration: "45 min",
    locked: true,
  },
  {
    id: 2,
    title: "Técnicas de corte e ritmo",
    description: "Domine tempo e ritmo para manter a atenção do público",
    lessons: 7,
    duration: "1h 10min",
    locked: true,
  },
  {
    id: 3,
    title: "Transições de alta performance",
    description: "As transições mais eficazes usadas em reels fortes",
    lessons: 6,
    duration: "55 min",
    locked: true,
  },
  {
    id: 4,
    title: "Legendas e texto animado",
    description: "Como criar legendas que prendem a atenção",
    lessons: 4,
    duration: "35 min",
    locked: true,
  },
  {
    id: 5,
    title: "Sound design para reels",
    description: "Use o áudio para fortalecer suas edições",
    lessons: 5,
    duration: "50 min",
    locked: true,
  },
  {
    id: 6,
    title: "Projeto final: monte um reel forte",
    description: "Aplique tudo o que aprendeu em um projeto real",
    lessons: 3,
    duration: "40 min",
    locked: true,
  },
]

export default function CursoReelsPage() {
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Curso de edição para reels</h1>
        <p className="mt-1 text-muted-foreground">
          Conteúdo em produção para a próxima etapa da plataforma
        </p>
      </div>

      {/* Locked Banner */}
      <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center md:flex-row md:text-left">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              Curso em produção
            </h3>
            <p className="mt-1 text-muted-foreground">
              Este curso está em produção e será liberado primeiro para usuários Essential.
            </p>
          </div>
          <Link href="/dashboard/planos">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Crown className="h-4 w-4" />
              Fazer upgrade
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Course Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{modules.length}</p>
              <p className="text-sm text-muted-foreground">Módulos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Play className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalLessons}</p>
              <p className="text-sm text-muted-foreground">Aulas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">5h+</p>
              <p className="text-sm text-muted-foreground">de conteúdo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Módulos do curso</h2>
        {modules.map((module, index) => (
          <Card key={module.id} className="border-border bg-card opacity-75">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-lg font-bold text-muted-foreground">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">{module.title}</h3>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{module.description}</p>
                <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    {module.lessons} aulas
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {module.duration}
                  </span>
                </div>
              </div>
              <Button variant="outline" disabled className="border-border text-muted-foreground">
                <Lock className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <h3 className="text-xl font-semibold text-foreground">
            Pronto para subir o nível da sua edição de reels?
          </h3>
          <p className="max-w-md text-muted-foreground">
            Enquanto o conteúdo final é preparado, você já pode garantir seu plano e acompanhar os próximos lançamentos.
          </p>
          <Link href="/dashboard/planos">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              Ver planos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
