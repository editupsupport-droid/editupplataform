import Link from "next/link"
import { Instagram, Mail, Youtube } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-[#e5e7eb] bg-white px-4 py-10 text-[#111827] sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 overflow-hidden rounded-lg border border-[#e5e7eb]">
              <img src="/logo.jpeg" alt="EditUp" className="h-full w-full object-cover" />
            </span>
            <span className="text-sm font-semibold tracking-[-0.02em]">EditUp</span>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#6b7280]">
            O workspace para editores que querem vender, produzir e aprovar com mais controle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-[#6b7280]">
          <Link href="#features" className="hover:text-[#111827]">Funcionalidades</Link>
          <Link href="#pricing" className="hover:text-[#111827]">Preços</Link>
          <a href="mailto:editupsupport@gmail.com" className="hover:text-[#111827]">Contato</a>
          <a href="#" aria-label="Instagram" className="hover:text-[#111827]"><Instagram className="h-4 w-4" /></a>
          <a href="#" aria-label="YouTube" className="hover:text-[#111827]"><Youtube className="h-4 w-4" /></a>
          <a href="mailto:editupsupport@gmail.com" aria-label="Email" className="hover:text-[#111827]"><Mail className="h-4 w-4" /></a>
        </div>
      </div>
    </footer>
  )
}
