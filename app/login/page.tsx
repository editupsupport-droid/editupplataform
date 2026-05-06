"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, KeyRound, ShieldCheck, Sparkles } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"

const PLAN_CONTENT = {
  free: [
    "Toda conta começa no plano Free",
    "Acesso à calculadora de propostas",
    "Upgrade disponível a qualquer momento",
  ],
  starter: [
    "Calculadora de propostas",
    "Pack completo de edição",
    "Acesso vitalício aos recursos do plano",
    "Ideal para organizar os primeiros projetos",
  ],
  essential: [
    "Tudo do Starter",
    "Acesso completo à plataforma",
    "CRM, Agenda, Financeiro e Drive",
    "Comunidade privada",
    "Suporte prioritário",
  ],
} as const

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { loginUser, signInWithGoogle } = useAppSession()
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLAN_CONTENT>("free")
  const planItems = PLAN_CONTENT[selectedPlan] ?? PLAN_CONTENT.free

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const plan = params.get("plan")
    if (plan === "starter" || plan === "essential" || plan === "free") {
      setSelectedPlan(plan)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    const result = await loginUser(email, password)
    setIsLoading(false)

    if (!result.success) {
      setErrorMessage(result.message ?? "Nao foi possivel entrar.")
      return
    }

    router.push("/dashboard/calculadora")
  }

  const handleGoogleLogin = async () => {
    setErrorMessage("")
    setSuccessMessage("")
    setIsLoading(true)
    const result = await signInWithGoogle()
    if (!result.success) {
      setErrorMessage(result.message ?? "Nao foi possivel continuar com o Google.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-primary/16 blur-[128px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="absolute left-4 top-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:left-8 md:top-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="mb-8 flex justify-center">
          <div className="rounded-2xl border border-border bg-card/80 p-2 shadow-2xl">
            <img src="/logo.jpeg" alt="EditUp" className="h-12 w-12 rounded-xl object-cover sm:h-14 sm:w-14" />
          </div>
        </div>

        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-[0.95fr,1.05fr]">
        <Card className="w-full max-w-md border-border bg-card/95 md:max-w-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Workspace premium
            </div>
            <CardTitle className="text-2xl text-foreground">Entrar na EditUp</CardTitle>
            <CardDescription className="text-muted-foreground">
              Continue com Google ou acesse com email e senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full border-border"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                Continuar com Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou continue com email</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="voce@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-border bg-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Digite sua senha"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-border bg-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {successMessage && <p className="text-sm text-primary">{successMessage}</p>}
              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <Link href={`/cadastro?plan=${selectedPlan}`} className="text-primary hover:underline">
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </Card>
          <div className="hidden flex-col justify-center rounded-3xl border border-border bg-card/70 p-8 md:flex">
            <h3 className="mb-2 text-2xl font-semibold text-foreground">
              O plano {selectedPlan === "free" ? "Free" : selectedPlan === "starter" ? "Starter" : "Essential"} inclui:
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Uma experiência limpa para precificar, organizar entregas e operar com mais confiança.
            </p>
            <ul className="space-y-4">
              {planItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
