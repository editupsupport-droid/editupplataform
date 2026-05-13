"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAppSession } from "@/components/app/app-provider"

const navItems = [
  ["Dor e solução", "#pain"],
  ["Funcionalidades", "#features"],
  ["Depoimentos", "#proof"],
  ["Preços", "#pricing"],
  ["FAQ", "#faq"],
] as const

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { currentUser } = useAppSession()

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e7eb] bg-white/86 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
            <img src="/logo.jpeg" alt="EditUp" className="h-full w-full object-cover" />
          </span>
          <span className="text-sm font-semibold tracking-[-0.02em] text-[#111827]">EditUp</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href} className="text-sm font-medium text-[#6b7280] transition-colors hover:text-[#111827]">
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {currentUser ? (
            <Link href="/dashboard">
              <Button className="rounded-lg bg-[#111827] px-4 text-white hover:bg-[#0022fe]">Ir para dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-[#6b7280] hover:text-[#111827]">
                Entrar
              </Link>
              <Link href="/cadastro">
                <Button className="rounded-lg bg-[#0022fe] px-4 text-white shadow-sm hover:bg-[#001bd1]">
                  Começar agora - grátis
                </Button>
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setMobileMenuOpen((current) => !current)} aria-label="Abrir menu">
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-[#e5e7eb] bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navItems.map(([label, href]) => (
              <Link key={href} href={href} className="py-2 text-sm font-medium text-[#374151]" onClick={() => setMobileMenuOpen(false)}>
                {label}
              </Link>
            ))}
            <Link href={currentUser ? "/dashboard" : "/cadastro"} onClick={() => setMobileMenuOpen(false)}>
              <Button className="mt-2 h-12 w-full rounded-lg bg-[#0022fe] text-white hover:bg-[#001bd1]">
                {currentUser ? "Ir para dashboard" : "Começar agora - grátis"}
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
