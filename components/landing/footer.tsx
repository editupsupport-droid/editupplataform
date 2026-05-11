import Link from "next/link"
import { Instagram, Mail, Youtube } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#030713] px-5 py-12 text-white sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 overflow-hidden rounded-xl bg-white">
              <img src="/logo.jpeg" alt="EditUp" className="h-full w-full object-cover" />
            </span>
            <span className="text-lg font-black">EditUp</span>
          </Link>
          <p className="mt-4 max-w-md text-sm font-medium leading-6 text-white/58">
            Uma plataforma completa para editores de vídeo que querem vender, produzir e entregar com mais controle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm font-bold text-white/70">
          <Link href="#features" className="hover:text-white">Produtos</Link>
          <Link href="#pricing" className="hover:text-white">Preços</Link>
          <a href="mailto:editupsupport@gmail.com" className="hover:text-white">Contato</a>
          <a href="#" className="hover:text-white" aria-label="Instagram">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="#" className="hover:text-white" aria-label="YouTube">
            <Youtube className="h-5 w-5" />
          </a>
          <a href="mailto:editupsupport@gmail.com" className="hover:text-white" aria-label="Email">
            <Mail className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
