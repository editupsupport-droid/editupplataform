"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Check, KeyRound, Sparkles } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"
import { canDirectLoginEmail } from "@/lib/app-data"

const PLAN_CONTENT = {
  free: [
    "Toda conta começa no Starter gratuito",
    "Agenda, clientes e página profissional",
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
    "CRM, Produção, Financeiro e Drive",
    "Marketplace com download liberado",
  ],
  pro: [
    "Tudo do Essential",
    "Creative Cloud",
    "Customização de logo",
    "Benefícios Pro com pagamento ativo",
  ],
} as const

export default function CadastroPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { registerUser, signInWithGoogle } = useAppSession()
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLAN_CONTENT>("free")
  const planItems = PLAN_CONTENT[selectedPlan] ?? PLAN_CONTENT.free

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const plan = params.get("plan")
    if (plan === "starter" || plan === "essential" || plan === "free" || plan === "pro") {
      setSelectedPlan(plan)
    }
  }, [])

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const result = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
      })

      if (!result.success) {
        setErrorMessage(result.message ?? "Nao foi possivel criar sua conta.")
        return
      }

      const normalizedEmail = email.trim().toLowerCase()

      if (result.signedIn || canDirectLoginEmail(normalizedEmail)) {
        router.push("/dashboard/calculadora")
        return
      }

      setSuccessMessage(result.message ?? "Conta criada com sucesso.")
    } catch (error) {
      console.error(error)
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel criar sua conta.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    setErrorMessage("")
    setSuccessMessage("")
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
          <Card className="border-border bg-card/95">
            <CardHeader>
              <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Comece em minutos
              </div>
              <CardTitle className="text-2xl text-foreground">Criar conta</CardTitle>
              <CardDescription className="text-muted-foreground">
                Continue com Google ou crie sua conta com email e senha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border"
                  onClick={handleGoogleSignup}
                  disabled={isLoading}
                >
                  Criar conta com Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou crie com email</span>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">Nome</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Seu nome"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-border bg-input text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
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
                      placeholder="Crie sua senha"
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
                    {isLoading ? "Criando..." : "Criar conta"}
                  </Button>
                </form>

                {successMessage && <p className="text-sm text-primary">{successMessage}</p>}
                {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
              </div>
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-muted-foreground">
                Já tem conta?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </CardFooter>
          </Card>

          <div className="hidden flex-col justify-center rounded-3xl border border-border bg-card/70 p-8 md:flex">
            <h3 className="mb-2 text-2xl font-semibold text-foreground">
              O que você recebe no plano {selectedPlan === "free" ? "Starter" : selectedPlan === "starter" ? "Starter" : selectedPlan === "pro" ? "Pro" : "Essential"}:
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Recursos e acessos de acordo com o plano selecionado na landing page.
            </p>
            <ul className="space-y-4">
              {planItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                    <Check className="h-4 w-4 text-primary" />
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
