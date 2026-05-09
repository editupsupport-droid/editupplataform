"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FolderOpen,
  HardDrive,
  Instagram,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
  Settings,
  SlidersHorizontal,
  Store,
  User,
  Video,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NotificationBadge } from "@/components/dashboard/notification-badge"
import { cn } from "@/lib/utils"
import { canAccessDashboardPath, PLAN_LABELS, type PlanId } from "@/lib/app-data"
import { useAppSession } from "@/components/app/app-provider"
import { useAppPreferences } from "@/components/app/preferences-provider"
import { fetchUnreadNotificationCount, subscribeWorkspaceSync } from "@/lib/workspace-db"

type NavItem = {
  nameKey:
    | "dashboard"
    | "clients"
    | "schedule"
    | "notifications"
    | "quotes"
    | "finance"
    | "calculator"
    | "jobs"
    | "pack"
    | "exchange"
    | "drive"
  href: string
  icon: LucideIcon
  minimumPlan: PlanId
  isNotification?: boolean
}

type CourseItem = {
  nameKey: "reelsCourse" | "outreach"
  href: string
  icon: LucideIcon
  minimumPlan: PlanId
}

const operationItems: NavItem[] = [
  { nameKey: "dashboard", href: "/dashboard", icon: LayoutDashboard, minimumPlan: "essential" },
  { nameKey: "clients", href: "/dashboard/clientes", icon: User, minimumPlan: "essential" },
  { nameKey: "schedule", href: "/dashboard/kanban", icon: CalendarDays, minimumPlan: "essential" },
  { nameKey: "quotes", href: "/dashboard/orcamentos", icon: ClipboardList, minimumPlan: "essential" },
  { nameKey: "finance", href: "/dashboard/financeiro", icon: Wallet, minimumPlan: "essential" },
  { nameKey: "notifications", href: "/dashboard/notificacoes", icon: Bell, minimumPlan: "essential", isNotification: true },
]

const resourceItems: NavItem[] = [
  { nameKey: "calculator", href: "/dashboard/calculadora", icon: Calculator, minimumPlan: "free" },
  { nameKey: "drive", href: "/dashboard/drive", icon: HardDrive, minimumPlan: "starter" },
  { nameKey: "pack", href: "/dashboard/pack", icon: Package, minimumPlan: "starter" },
  { nameKey: "exchange", href: "/dashboard/exchange", icon: Store, minimumPlan: "starter" },
  { nameKey: "jobs", href: "/dashboard/vagas", icon: BriefcaseBusiness, minimumPlan: "essential" },
]

const sidebarLayoutKey = "editup-sidebar-layout"
type SidebarSection = "operation" | "resources"
type SidebarLayout = Partial<Record<NavItem["nameKey"], SidebarSection>>
const customizableItems = [...operationItems, ...resourceItems]

const getItemSection = (item: NavItem, layout: SidebarLayout): SidebarSection => {
  const configuredSection = layout[item.nameKey]
  if (configuredSection) return configuredSection
  return operationItems.some((operationItem) => operationItem.nameKey === item.nameKey) ? "operation" : "resources"
}

const courseItems: CourseItem[] = [
  { nameKey: "reelsCourse", href: "/dashboard/curso-reels", icon: Video, minimumPlan: "essential" },
  { nameKey: "outreach", href: "/dashboard/prospeccao", icon: Instagram, minimumPlan: "essential" },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [coursesOpen, setCoursesOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [sidebarDialogOpen, setSidebarDialogOpen] = useState(false)
  const [sidebarLayout, setSidebarLayout] = useState<SidebarLayout>({})
  const { currentUser, logoutUser, isReady } = useAppSession()
  const { t } = useAppPreferences()

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(sidebarLayoutKey) ?? "{}") as SidebarLayout
      setSidebarLayout(parsed && typeof parsed === "object" ? parsed : {})
    } catch {
      setSidebarLayout({})
    }
  }, [])

  const saveSidebarLayout = (nextLayout: SidebarLayout) => {
    setSidebarLayout(nextLayout)
    window.localStorage.setItem(sidebarLayoutKey, JSON.stringify(nextLayout))
  }

  const customOperationItems = useMemo(
    () => customizableItems.filter((item) => getItemSection(item, sidebarLayout) === "operation"),
    [sidebarLayout]
  )
  const customResourceItems = useMemo(
    () => customizableItems.filter((item) => getItemSection(item, sidebarLayout) === "resources"),
    [sidebarLayout]
  )

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

  useEffect(() => {
    if (pathname === "/dashboard/notificacoes") {
      setNotificationCount(0)
    }
  }, [pathname])

  useEffect(() => {
    if (!courseItems.some((item) => pathname === item.href)) {
      setCoursesOpen(false)
    }
    if (!customResourceItems.some((item) => pathname === item.href)) {
      setResourcesOpen(false)
    } else {
      setResourcesOpen(true)
    }
  }, [customResourceItems, pathname])

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    await logoutUser()
    router.push("/")
    router.refresh()
  }

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground lg:hidden"
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
          "premium-floating-sidebar fixed left-0 top-0 z-40 h-full w-72 border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out lg:left-0 lg:top-0 lg:h-screen lg:w-[260px] lg:translate-x-0 lg:overflow-hidden lg:rounded-none lg:border-r lg:shadow-none",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-sidebar-border px-3 py-4 lg:px-4">
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-secondary">
              <img src="/favicon.svg" alt="EditUp" className="h-8 w-8 shrink-0 rounded-md object-cover" />
              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">EditUp</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-3 lg:px-4">
            <p className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">Operação</p>
            {customOperationItems.map((item) => {
              const isActive = pathname === item.href
              const isLocked = isReady
                ? (currentUser ? !canAccessDashboardPath(item.href, currentUser.plan) : true)
                : false

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setCoursesOpen(false)
                    setResourcesOpen(false)
                  }}
                  title={isLocked ? `Disponível no plano ${PLAN_LABELS[item.minimumPlan]}` : t(item.nameKey)}
                  className={cn(
                    "premium-sidebar-item group/nav relative flex h-9 items-center gap-2 rounded-md border border-transparent px-2 text-sm transition-colors duration-150",
                    isActive
                      ? "is-active bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    isLocked && "opacity-70"
                  )}
                >
                  <div
                    className={cn(
                      "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="min-w-0 flex-1 truncate">{t(item.nameKey)}</span>
                  <div>
                    {item.isNotification && <NotificationBadge count={notificationCount} />}
                  </div>
                  {isLocked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                </Link>
              )
            })}

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setResourcesOpen((current) => !current)
                  setCoursesOpen(false)
                }}
                className={cn(
                  "premium-sidebar-item group/nav relative flex h-9 w-full items-center gap-2 rounded-md border border-transparent px-2 text-sm transition-colors duration-150",
                  resourcesOpen || customResourceItems.some((item) => pathname === item.href)
                    ? "is-active bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-current">
                  <Package className="h-4 w-4" />
                </div>
                <span className="min-w-0 flex-1 truncate text-left">Recursos</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-all duration-200", resourcesOpen && "rotate-180")} />
              </button>

              {resourcesOpen && (
                <div className="space-y-1 pl-4">
                  {customResourceItems.map((item) => {
                    const isActive = pathname === item.href
                    const isLocked = isReady
                      ? (currentUser ? !canAccessDashboardPath(item.href, currentUser.plan) : true)
                      : false

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        title={isLocked ? `Disponível no plano ${PLAN_LABELS[item.minimumPlan]}` : t(item.nameKey)}
                        className={cn(
                          "premium-sidebar-item group/nav relative flex h-8 items-center gap-2 rounded-md border border-transparent px-2 text-sm transition-colors duration-150",
                          isActive
                            ? "is-active bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          isLocked && "opacity-70"
                        )}
                      >
                        <div className={cn("relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-md", isActive ? "text-foreground" : "text-muted-foreground")}>
                          <item.icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="min-w-0 flex-1 truncate">{t(item.nameKey)}</span>
                        {isLocked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      </Link>
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setCoursesOpen((current) => !current)
                  setResourcesOpen(false)
                }}
                className={cn(
                  "premium-sidebar-item group/nav relative flex h-9 w-full items-center gap-2 rounded-md border border-transparent px-2 text-sm transition-colors duration-150",
                  coursesOpen || courseItems.some((item) => pathname === item.href)
                    ? "is-active bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-current">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <span className="min-w-0 flex-1 truncate text-left">
                  Cursos
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-all duration-200", coursesOpen && "rotate-180")} />
              </button>

              {coursesOpen && (
                <div className="space-y-1 pl-4">
                  {courseItems.map((item) => {
                    const isActive = pathname === item.href
                    const isLocked = isReady
                      ? (currentUser ? !canAccessDashboardPath(item.href, currentUser.plan) : true)
                      : false

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setMobileMenuOpen(false)
                        }}
                        title={isLocked ? `Disponível no plano ${PLAN_LABELS[item.minimumPlan]}` : t(item.nameKey)}
                        className={cn(
                          "premium-sidebar-item group/nav relative flex h-8 items-center gap-2 rounded-md border border-transparent px-2 text-sm transition-colors duration-150",
                          isActive
                            ? "is-active bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          isLocked && "opacity-70"
                        )}
                      >
                        <div className={cn("relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-md", isActive ? "text-foreground" : "text-muted-foreground")}>
                          <item.icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="min-w-0 flex-1 truncate">
                          {t(item.nameKey)}
                        </span>
                        {isLocked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </nav>

          <div className="border-t border-sidebar-border p-4">
            {currentUser ? (
              <div className="flex flex-col gap-1 rounded-lg border border-sidebar-border bg-sidebar-accent p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setSidebarDialogOpen(true)
                  }}
                  className="h-9 w-full shrink-0 justify-start rounded-md px-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Personalizar barra"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="ml-2">Personalizar barra</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    router.push("/dashboard/configuracoes")
                  }}
                  className="h-9 w-full shrink-0 justify-start rounded-md px-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Open settings"
                >
                  <Settings className="h-4 w-4" />
                  <span className="ml-2">{t("settings")}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setLogoutDialogOpen(true)
                  }}
                  className="h-9 w-full shrink-0 justify-start rounded-md px-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={t("logout")}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-2">{t("logout")}</span>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="max-w-sm rounded-lg border-border bg-card shadow-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sair da conta?</DialogTitle>
            <DialogDescription>Você será desconectado desta sessão.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setLogoutDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void handleLogout()}>
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={sidebarDialogOpen} onOpenChange={setSidebarDialogOpen}>
        <DialogContent className="max-w-xl rounded-lg border-border bg-card shadow-sm">
          <DialogHeader>
            <DialogTitle>Personalizar barra lateral</DialogTitle>
            <DialogDescription>
              Escolha onde cada módulo aparece. Exemplo: mover Clientes para Recursos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {customizableItems.map((item) => {
              const section = getItemSection(item, sidebarLayout)

              return (
                <div key={item.nameKey} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium text-foreground">{t(item.nameKey)}</span>
                  </div>
                  <div className="flex rounded-md border border-border bg-card p-1">
                    {(["operation", "resources"] as SidebarSection[]).map((targetSection) => (
                      <button
                        key={targetSection}
                        type="button"
                        onClick={() => saveSidebarLayout({ ...sidebarLayout, [item.nameKey]: targetSection })}
                        className={cn(
                          "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                          section === targetSection
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        {targetSection === "operation" ? "Operação" : "Recursos"}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => saveSidebarLayout({})}>
              Restaurar padrão
            </Button>
            <Button onClick={() => setSidebarDialogOpen(false)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
