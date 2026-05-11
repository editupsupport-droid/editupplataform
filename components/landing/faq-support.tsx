import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarDays, Mail, PlayCircle } from "lucide-react"

export function FaqSupport() {
  return (
    <section id="faq" className="bg-[#f7f7f5] px-5 py-16 text-[#171717] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.065em] sm:text-5xl">
          Preferido pelas equipes de sucesso.
        </h2>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-[#e5e1dc] bg-white p-6">
            <p className="text-2xl font-black leading-tight tracking-[-0.055em]">
              “Hoje a EditUp coloca proposta, cliente, entrega e aprovação no mesmo lugar. O trabalho fica mais leve.”
            </p>
            <p className="mt-6 text-sm font-bold text-[#666]">Murilo, editor de vídeo</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#e5e1dc] bg-[#171717] p-5 text-white">
            <div className="flex h-52 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.18),transparent_30%),#222]">
              <PlayCircle className="h-16 w-16 text-white/80" />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {["Mais clareza para vender", "Menos cobrança no WhatsApp", "Entrega com cara profissional"].map((item) => (
            <div key={item} className="rounded-2xl border border-[#e5e1dc] bg-white p-5 text-sm font-bold">
              {item}
              <p className="mt-2 text-sm font-medium leading-6 text-[#666]">Fluxos simples, mas com profundidade suficiente para operação real.</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.065em] sm:text-5xl">
          Teste gratuitamente.
        </h2>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e5e1dc] bg-white p-6">
            <Mail className="h-7 w-7" />
            <h3 className="mt-6 text-2xl font-black tracking-[-0.055em]">Comece a usar a EditUp</h3>
            <p className="mt-3 text-sm font-medium leading-6 text-[#666]">Crie sua conta, entre no dashboard e teste o fluxo principal antes de assinar.</p>
            <Link href="/cadastro" className="mt-7 inline-flex">
              <Button className="rounded-xl bg-[#171717] px-6 font-bold text-white hover:bg-[#0022fe]">
                Criar conta grátis
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-[#e5e1dc] bg-white p-6">
            <CalendarDays className="h-7 w-7" />
            <h3 className="mt-6 text-2xl font-black tracking-[-0.055em]">Solicite uma demonstração</h3>
            <p className="mt-3 text-sm font-medium leading-6 text-[#666]">Quer validar o fluxo antes de lançar para clientes? Fale com o suporte.</p>
            <a href="mailto:editupsupport@gmail.com" className="mt-7 inline-flex">
              <Button variant="outline" className="rounded-xl border-[#171717] px-6 font-bold text-[#171717] hover:bg-[#171717] hover:text-white">
                Falar com suporte
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
