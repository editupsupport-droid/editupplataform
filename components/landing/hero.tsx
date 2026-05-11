import Link from "next/link"
import { Button } from "@/components/ui/button"

const logoRow = ["Clientes", "Orçamentos", "Produção", "Drive", "Aprovações", "Receita"]

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#03083a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.2),transparent_28%),linear-gradient(180deg,#02061f_0%,#06105a_100%)]" />
      <div className="pointer-events-none absolute left-[-14rem] top-40 h-28 w-[48rem] rounded-r-full border-[8px] border-[#3156ff]" />
      <div className="pointer-events-none absolute right-[-10rem] top-56 h-80 w-[48rem] rounded-l-[8rem] border-[8px] border-[#3156ff]" />
      <div className="pointer-events-none absolute bottom-28 left-[-8rem] h-48 w-[34rem] rounded-r-[5rem] border-[8px] border-[#3156ff] opacity-70" />

      <div className="relative z-10 border-b border-[#dce2ff] bg-white py-2.5 text-center text-xs font-semibold text-[#030713] sm:text-sm">
        EditUp: workspace de vendas, produção e aprovação para editores de vídeo.
      </div>

      <div className="relative z-10 mx-auto max-w-[1180px] px-5 pb-12 pt-28 sm:px-8 lg:px-10 lg:pt-30">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-[4.35rem]">
            Conheça o sistema que organiza sua operação.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-sm font-medium leading-7 text-white/75 sm:text-base">
            CRM, orçamentos, produção, financeiro, Drive e links de aprovação em uma interface simples para trabalhar com clientes reais.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/cadastro">
              <Button className="h-11 rounded-xl bg-[#4968ff] px-6 text-sm font-bold text-white shadow-[0_16px_40px_rgba(0,34,254,0.35)] hover:bg-[#5b78ff]">
                Use a EditUp de graça
              </Button>
            </Link>
            <Link href="#features">
              <Button className="h-11 rounded-xl border border-white/15 bg-white/8 px-6 text-sm font-bold text-white hover:bg-white/14 hover:text-white">
                Ver como funciona
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mx-auto mt-10 max-w-[980px]">
          <FloatingBadge className="-left-8 top-12 hidden rotate-[-8deg] md:flex" label="Cliente novo" tone="bg-[#fff4d6] text-[#342000]" />
          <FloatingBadge className="-right-7 top-24 hidden rotate-[8deg] md:flex" label="Aprovação" tone="bg-[#ffe4ef] text-[#3c071d]" />
          <FloatingBadge className="-left-12 bottom-20 hidden rotate-[7deg] md:flex" label="Drive ok" tone="bg-[#ddfff3] text-[#063729]" />
          <FloatingBadge className="-right-10 bottom-24 hidden rotate-[-9deg] md:flex" label="Receita" tone="bg-[#e7eaff] text-[#101a6b]" />

          <div className="overflow-hidden rounded-[18px] border border-white/18 bg-[#191919] shadow-[0_34px_90px_rgba(0,0,0,0.48)]">
            <img
              src="/landing-workspace.png"
              alt="Workspace da EditUp mostrando o kanban de produção do editor"
              className="block w-full object-cover"
            />
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/56">
          {logoRow.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function FloatingBadge({ label, tone, className }: { label: string; tone: string; className?: string }) {
  return (
    <div className={`absolute z-20 items-center gap-2 rounded-full px-3 py-2 text-xs font-black shadow-xl ${tone} ${className}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </div>
  )
}
