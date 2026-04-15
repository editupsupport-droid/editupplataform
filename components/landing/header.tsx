"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { useAppSession } from "@/components/app/app-provider"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { currentUser } = useAppSession()
  const profilePhoto = currentUser?.profile?.photoUrl?.trim() ?? ""
  const fallbackInitial = currentUser?.name?.trim().charAt(0).toUpperCase() ?? "A"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <img src="/placeholder-logo.svg" alt="Astherisch" className="h-8 w-auto" />
          <span className="text-xl font-semibold text-foreground">Astherisch</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Recursos
          </Link>
          <Link href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Planos
          </Link>
          <Link href="#testimonials" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Depoimentos
          </Link>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {currentUser ? (
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold text-foreground">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={currentUser.name} className="h-full w-full object-cover" />
                ) : (
                  fallbackInitial
                )}
              </div>
              <span className="text-sm text-foreground">Ir para dashboard</span>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Entrar
                </Button>
              </Link>
              <Link href="/cadastro">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Começar Agora
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="flex items-center justify-center md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border/50 bg-background md:hidden">
          <nav className="flex flex-col gap-4 px-4 py-6">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Recursos
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Planos
            </Link>
            <Link
              href="#testimonials"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Depoimentos
            </Link>
            <div className="flex flex-col gap-2 pt-4">
              {currentUser ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Ir para dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                      Entrar
                    </Button>
                  </Link>
                  <Link href="/cadastro">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Começar Agora
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
