"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calculator,
  Package,
  Video,
  Instagram,
  Bell,
  Settings,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  Users,
  MessageSquareMore,
  CalendarDays,
  Wallet,
  BriefcaseBusiness,
  Lock,
  LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { PLAN_LABELS, planMeets, PlanId } from "@/lib/app-data"
import { useAppSession } from "@/components/app/app-provider"
import { fetchUnreadNotificationCount, subscribeWorkspaceSync } from "@/lib/workspace-db"

const navigation: Array<{ name: string; href: string; icon: LucideIcon; minimumPlan: PlanId }> = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, minimumPlan: "starter" },
  { name: "Clientes", href: "/dashboard/clientes", icon: Users, minimumPlan: "starter" },
  { name: "Comunidade", href: "/dashboard/comunidade", icon: MessageSquareMore, minimumPlan: "essential" },
  { name: "Agenda", href: "/dashboard/kanban", icon: CalendarDays, minimumPlan: "starter" },
  { name: "Financeiro", href: "/dashboard/financeiro", icon: Wallet, minimumPlan: "starter" },
  { name: "Calculadora", href: "/dashboard/calculadora", icon: Calculator, minimumPlan: "free" },
  { name: "Pack de Edição", href: "/dashboard/pack", icon: Package, minimumPlan: "starter" },
  { name: "Vagas", href: "/dashboard/vagas", icon: BriefcaseBusiness, minimumPlan: "starter" },
  { name: "Curso de Reels", href: "/dashboard/curso-reels", icon: Video, minimumPlan: "essential" },
  { name: "Prospecção", href: "/dashboard/prospeccao", icon: Instagram, minimumPlan: "essential" },
]

const bottomNavigation: Array<{ name: string; href: string; icon: LucideIcon; minimumPlan?: PlanId }> = [
  { name: "Notificações", href: "/dashboard/notificacoes", icon: Bell, minimumPlan: "starter" },
  { name: "Planos", href: "/dashboard/planos", icon: CreditCard },
  { name: "Perfil", href: "/dashboard/perfil", icon: User, minimumPlan: "starter" },
  { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings, minimumPlan: "starter" },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const { currentUser, logoutUser, isReady } = useAppSession()

  const visibleNavigation = navigation
  const visibleBottomNavigation = bottomNavigation

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
  }, [currentUser, pathname])

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-card text-foreground lg:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border bg-sidebar transition-transform lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <img src="/placeholder-logo.svg" alt="Astherisch" className="h-8 w-auto" />
          <div className="min-w-0">
            <span className="block text-xl font-semibold text-sidebar-foreground">Astherisch</span>
            {currentUser && (
              <span className="block truncate text-xs text-sidebar-foreground/60">
                Plano {PLAN_LABELS[currentUser.plan]}
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href
            const isLocked = isReady ? (currentUser ? !planMeets(currentUser.plan, item.minimumPlan) : true) : false
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  isLocked && "opacity-80"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                <div className="ml-auto flex items-center gap-2">
                  {item.name === "Notificações" && notificationCount > 0 && (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                        {notificationCount}
                      </span>
                    </>
                  )}
                  {isLocked && <Lock className="h-4 w-4" />}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-4">
          {visibleBottomNavigation.map((item) => {
            const isActive = pathname === item.href
            const isLocked = isReady ? (currentUser ? !planMeets(currentUser.plan, item.minimumPlan ?? "free") : true) : false
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  isLocked && "opacity-80"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                <div className="ml-auto flex items-center gap-2">
                  {item.name === "Notificações" && notificationCount > 0 && (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                        {notificationCount}
                      </span>
                    </>
                  )}
                  {isLocked && <Lock className="h-4 w-4" />}
                </div>
              </Link>
            )
          })}
          <Link href="/">
            <Button
              variant="ghost"
              onClick={logoutUser}
              className="mt-2 w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </Link>
        </div>
      </aside>
    </>
  )
}
