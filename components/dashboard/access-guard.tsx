"use client"

import Link from "next/link"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Crown, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { canAccessDashboardPath } from "@/lib/app-data"
import { useAppSession } from "@/components/app/app-provider"

export function DashboardAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, isReady } = useAppSession()

  useEffect(() => {
    if (!isReady) return

    if (!currentUser) {
      router.replace("/login")
      return
    }
  }, [currentUser, isReady, pathname, router])

  if (!isReady || !currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  if (canAccessDashboardPath(pathname, currentUser.plan)) {
    return <>{children}</>
  }

  const isStarterTier = currentUser.plan === "free" || currentUser.plan === "starter"

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center">
      <Card className="w-full border-primary/40 bg-card">
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              {isStarterTier ? (
              <Lock className="h-8 w-8 text-primary" />
            ) : (
              <Crown className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {isStarterTier ? "Plano Starter ativo" : "Área protegida"}
            </h1>
            <p className="text-muted-foreground">
              {isStarterTier
                ? "No Starter você visualiza recursos base. Para baixar marketplace, usar financeiro completo e liberar automações, faça upgrade."
                : "Essa área está protegida pelo seu plano atual."}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard/calculadora">
              <Button variant="outline" className="border-border">
                Ir para calculadora
              </Button>
            </Link>
            {isStarterTier && (
              <Link href="/dashboard/pack">
                <Button variant="outline" className="border-border">
                  Abrir pack
                </Button>
              </Link>
            )}
            <Link href="/dashboard/planos">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Ver planos
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
