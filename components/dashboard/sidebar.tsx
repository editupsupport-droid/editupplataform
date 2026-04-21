"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Bell,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  CreditCard,
  Instagram,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquareMore,
  Package,
  Settings,
  User,
  Video,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PLAN_LABELS, canAccessDashboardPath, type PlanId } from "@/lib/app-data"
import { useAppSession } from "@/components/app/app-provider"
import { fetchUnreadNotificationCount, subscribeWorkspaceSync } from "@/lib/workspace-db"

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  minimumPlan: PlanId
  isNotification?: boolean
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, minimumPlan: "essential" },
  { name: "Clientes", href: "/dashboard/clientes", icon: User, minimumPlan: "essential" },
  { name: "Agenda", href: "/dashboard/kanban", icon: CalendarDays, minimumPlan: "essential" },
  { name: "Notificações", href: "/dashboard/notificacoes", icon: Bell, minimumPlan: "essential", isNotification: true },
  { name: "Finanças", href: "/dashboard/financeiro", icon: Wallet, minimumPlan: "essential" },
  { name: "Calculadora", href: "/dashboard/calculadora", icon: Calculator, minimumPlan: "free" },
  { name: "Vagas", href: "/dashboard/vagas", icon: BriefcaseBusiness, minimumPlan: "essential" },
  { name: "Pack de Edição", href: "/dashboard/pack", icon: Package, minimumPlan: "starter" },
  { name: "Curso de Reels", href: "/dashboard/curso-reels", icon: Video, minimumPlan: "essential" },
  { name: "Prospecção", href: "/dashboard/prospeccao", icon: Instagram, minimumPlan: "essential" },
  { name: "Comunidade", href: "/dashboard/comunidade", icon: MessageSquareMore, minimumPlan: "essential" },
  { name: "Planos", href: "/dashboard/planos", icon: CreditCard, minimumPlan: "free" },
  { name: "Perfil", href: "/dashboard/perfil", icon: User, minimumPlan: "essential" },
  { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings, minimumPlan: "essential" },
]

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ED"

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const { currentUser, logoutUser, isReady } = useAppSession()

  useEffect(() => {
    if (!currentUser) {
      setNotificationCount(0)
      return
    }

    const syncNotifications = async () => {
      try {
        setNotificationCount(await fetchUnreadNotificationCount(currentUser.id))
      } catch (error) {
        console.error(error)
      }
    }

    void syncNotifications()
    return subscribeWorkspaceSync(() => {
      void syncNotifications()
    })
  }, [currentUser])

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    await logoutUser()
    router.push("/")
    router.refresh()
  }

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border/80 bg-sidebar/95 text-sidebar-foreground shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur lg:hidden"
        onClick={() => setMobileMenuOpen((current) => !current)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-72 border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur transition-transform duration-200 lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-sidebar-border/80 px-5 py-5">
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
              <img src="/logo.jpeg" alt="Astherisch" className="h-10 w-10 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">Astherisch</p>
                <p className="truncate text-xs text-sidebar-foreground/55">Workspace do editor</p>
              </div>
            </Link>
          </div>

          <div className="px-5 pt-5">
            {currentUser && (
              <div className="rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/70 px-4 py-4">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-sidebar-foreground/45">Plano</p>
                <p className="mt-2 text-sm font-semibold text-sidebar-foreground">{PLAN_LABELS[currentUser.plan]}</p>
                <p className="mt-1 text-xs leading-5 text-sidebar-foreground/55">Acesse suas ferramentas e acompanhe seu fluxo de trabalho.</p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const isLocked = isReady
                ? (currentUser ? !canAccessDashboardPath(item.href, currentUser.plan) : true)
                : false

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border border-transparent px-3.5 py-3 text-sm transition-all duration-200",
                    isActive
                      ? "border-sidebar-border/80 bg-sidebar-accent text-sidebar-foreground shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                      : "text-sidebar-foreground/70 hover:border-sidebar-border/60 hover:bg-sidebar-accent/75 hover:text-sidebar-foreground",
                    isLocked && "opacity-70"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-transparent transition-colors",
                      isActive
                        ? "border-primary/20 bg-primary/12 text-primary"
                        : "text-sidebar-foreground/55"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {item.isNotification && notificationCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[0.7rem] font-semibold text-white">
                      {notificationCount}
                    </span>
                  )}
                  {isLocked && <Lock className="h-4 w-4 text-sidebar-foreground/45" />}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-sidebar-border/80 p-4">
            {currentUser ? (
              <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/75 px-3.5 py-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_10px_26px_rgba(0,34,254,0.22)]">
                  {getInitials(currentUser.profile.fullName || currentUser.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {currentUser.profile.fullName || currentUser.name}
                  </p>
                  <p className="truncate text-xs text-sidebar-foreground/55">{currentUser.email}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleLogout()}
                  className="h-10 w-10 rounded-xl p-0 text-sidebar-foreground/70 hover:bg-primary hover:text-primary-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  )
}
