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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#030713]/78 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_10px_30px_rgba(0,34,254,0.25)]">
            <img src="/logo.jpeg" alt="EditUp" className="h-full w-full object-cover" />
          </span>
          <span className="hidden text-sm font-bold sm:inline">EditUp</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          <Link href="#features" className="text-sm font-semibold text-white/82 transition-colors hover:text-white">
            Produtos
          </Link>
          <Link href="#features" className="text-sm font-semibold text-white/82 transition-colors hover:text-white">
            Soluções
          </Link>
          <Link href="#pricing" className="text-sm font-semibold text-white/82 transition-colors hover:text-white">
            Preços
          </Link>
          <Link href="#faq" className="text-sm font-semibold text-white/82 transition-colors hover:text-white">
            Solicite uma demonstração
          </Link>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {currentUser ? (
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={currentUser.name} className="h-full w-full object-cover" />
                ) : (
                  fallbackInitial
                )}
              </div>
              <span className="text-sm font-semibold text-white">Ir para dashboard</span>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="font-semibold text-white hover:bg-white/10 hover:text-white">
                  Fazer login
                </Button>
              </Link>
              <Link href="/cadastro">
                <Button className="rounded-xl bg-[#4768ff] px-5 font-semibold text-white shadow-[0_10px_30px_rgba(0,34,254,0.3)] hover:bg-[#5b78ff]">
                  Use a EditUp de graça
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="flex items-center justify-center md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#030713] md:hidden">
          <nav className="flex flex-col gap-4 px-4 py-6">
            <Link
              href="#features"
              className="text-sm font-semibold text-white/80 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Produtos
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-semibold text-white/80 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Preços
            </Link>
            <Link
              href="#faq"
              className="text-sm font-semibold text-white/80 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Demonstração
            </Link>
            <div className="flex flex-col gap-2 pt-4">
              {currentUser ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full rounded-xl bg-[#4768ff] text-white hover:bg-[#5b78ff]">
                    Ir para o dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white">
                      Fazer login
                    </Button>
                  </Link>
                  <Link href="/cadastro">
                    <Button className="w-full rounded-xl bg-[#4768ff] text-white hover:bg-[#5b78ff]">
                      Use a EditUp de graça
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
