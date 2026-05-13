"use client"

import Link from "next/link"
import { Crown, LockKeyhole, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type UpgradePaywallProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  requiredPlan?: "Essential" | "Pro"
}

export function UpgradePaywall({
  open,
  onOpenChange,
  title = "Recurso protegido",
  description = "Faça upgrade para liberar este fluxo com segurança.",
  requiredPlan = "Essential",
}: UpgradePaywallProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-white/10 bg-[#080c18] p-0 text-white shadow-2xl">
        <div className="relative p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,34,254,0.38),transparent_42%)]" />
          <div className="relative">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0022fe] shadow-[0_16px_40px_rgba(0,34,254,0.35)]">
              {requiredPlan === "Pro" ? <Crown className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight text-white">{title}</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-white/64">{description}</DialogDescription>
            </DialogHeader>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-[#7f96ff]" />
                Plano necessário: {requiredPlan}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/58">
                O acesso só é liberado para contas com pagamento confirmado e assinatura ativa.
              </p>
            </div>
            <DialogFooter className="mt-6 gap-2 sm:justify-start">
              <Link href="/dashboard/planos" className="w-full sm:w-auto">
                <Button className="w-full bg-[#0022fe] text-white hover:bg-[#2444ff]">
                  Ver planos
                </Button>
              </Link>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => onOpenChange(false)}>
                Agora não
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
