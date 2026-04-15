"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"

const PLAN_CONTENT = {
  free: [
    "Cadastro já entra no plano Free",
    "Acesso somente à calculadora de valores",
    "Upgrade quando quiser",
  ],
  starter: [
    "Calculadora de preços de vídeo",
    "Pack de edição completo",
    "Área de vagas para visualizar oportunidades",
    "Página profissional pública",
    "100+ presets e transições",
    "Efeitos sonoros básicos",
    "Acesso vitalício",
  ],
  essential: [
    "Tudo do plano Starter",
    "Comunidade exclusiva",
    "Avisos de novas vagas",
    "Aulas semanais",
    "Cursos de edição em produção",
    "Atualizações mensais de conteúdo",
    "Suporte prioritário",
    "Certificado de conclusão",
  ],
} as const

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [token, setToken] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const { loginUser, verifyEmailCode, signInWithGoogle } = useAppSession()
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
    setCodeSent(false)

    const result = await loginUser(email, password)
    setIsLoading(false)

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível entrar.")
      return
    }

    if (result.requiresCode) {
      setCodeSent(true)
      setSuccessMessage(result.message ?? "Código enviado.")
      return
    }

    router.push("/dashboard/calculadora")
  }

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    const result = await verifyEmailCode(email, token)
    setIsLoading(false)

    if (!result.success) {
      setErrorMessage(result.message ?? "Código inválido.")
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
      setErrorMessage(result.message ?? "Não foi possível entrar com Google.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[128px]" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="absolute left-4 top-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:left-8 md:top-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <img src="/placeholder-logo.svg" alt="Astherisch" className="h-10 w-auto" />
          <span className="text-2xl font-semibold text-foreground">Astherisch</span>
        </div>

        <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <Card className="w-full max-w-md border-border bg-card md:max-w-none">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-muted-foreground">
              Entre com Google ou use e-mail e senha para receber o código
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
                Entrar com Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou continue com código</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
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

              {codeSent && (
                <form onSubmit={handleVerifyCode} className="space-y-4 rounded-xl border border-border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="token" className="text-foreground">Código recebido</Label>
                    <Input
                      id="token"
                      type="text"
                      inputMode="numeric"
                      placeholder="Digite o código do e-mail"
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="border-border bg-input text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {isLoading ? "Validando..." : "Validar e entrar"}
                  </Button>
                </form>
              )}

              {successMessage && <p className="text-sm text-primary">{successMessage}</p>}
              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link href={`/cadastro?plan=${selectedPlan}`} className="text-primary hover:underline">
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </Card>
          <div className="hidden flex-col justify-center md:flex">
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              Conteúdo do plano {selectedPlan === "free" ? "Free" : selectedPlan === "starter" ? "Starter" : "Essential"}:
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Se você veio pela landing page, este é o conteúdo previsto para o plano selecionado.
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
