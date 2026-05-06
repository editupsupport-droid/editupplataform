"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  ChevronRight,
  Search,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useAppSession } from "@/components/app/app-provider"
import { useAppPreferences } from "@/components/app/preferences-provider"
import { dashboardNavItems } from "@/components/dashboard/nav-config"
import { canAccessDashboardPath } from "@/lib/app-data"
import { authFetch } from "@/lib/supabase"
import {
  fetchWorkspaceTasks,
  getCachedWorkspaceTasks,
  subscribeWorkspaceSync,
} from "@/lib/workspace-db"
import { WorkspaceTask } from "@/lib/workspace-store"

type UserSystemNotification = {
  id: string
  title: string
  message: string
  createdAt: string
  kind: "approval-expired" | "drive" | "system"
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ED"

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))

export function DashboardTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser } = useAppSession()
  const { t } = useAppPreferences()
  const [commandOpen, setCommandOpen] = useState(false)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [systemNotifications, setSystemNotifications] = useState<UserSystemNotification[]>([])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((current) => !current)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (!currentUser) return

    const cached = getCachedWorkspaceTasks(currentUser.id)
    if (cached) {
      setTasks(cached)
    }

    const load = async () => {
      try {
        const [workspaceTasks, systemResponse] = await Promise.all([
          fetchWorkspaceTasks(currentUser.id, { force: true }),
          authFetch("/api/system-notifications", { cache: "no-store" }),
        ])

        setTasks(workspaceTasks)

        const payload = (await systemResponse.json().catch(() => ({}))) as {
          notifications?: UserSystemNotification[]
        }
        if (systemResponse.ok) {
          setSystemNotifications(payload.notifications ?? [])
        }
      } catch (error) {
        console.error(error)
      }
    }

    void load()

    return subscribeWorkspaceSync(() => {
      const nextCached = getCachedWorkspaceTasks(currentUser.id)
      if (nextCached) {
        setTasks(nextCached)
      }
    })
  }, [currentUser])

  const availableItems = useMemo(
    () =>
      dashboardNavItems.filter((item) => (currentUser ? canAccessDashboardPath(item.href, currentUser.plan) : false)),
    [currentUser]
  )

  const recentNotifications = useMemo(() => {
    const taskItems = tasks
      .filter((task) => task.statusCliente && task.statusCliente !== "pendente")
      .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
      .slice(0, 4)
      .map((task) => ({
        id: task.id,
        title: task.titulo,
        message:
          task.statusCliente === "concluido"
            ? "Cliente aprovou a entrega."
            : "Cliente solicitou ajustes.",
        createdAt: task.updatedAt ?? new Date().toISOString(),
      }))

    const systemItems = systemNotifications.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt,
    }))

    return [...systemItems, ...taskItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
  }, [systemNotifications, tasks])

  const unreadCount = useMemo(
    () =>
      tasks.filter((task) => task.statusCliente && task.statusCliente !== "pendente" && !task.notificationRead)
        .length + systemNotifications.length,
    [systemNotifications.length, tasks]
  )

  useEffect(() => {
    const baseTitle = "EditUp - Plataforma para editores"
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle
  }, [unreadCount])

  if (!currentUser) return null

  const displayName = currentUser.name || currentUser.profile.fullName
  const photoUrl = currentUser.accountPhotoUrl?.trim() || ""

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-0 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Workspace</p>
          <p className="text-xs text-muted-foreground">Organize clientes, propostas e entregas.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="group/search flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-secondary text-muted-foreground transition-[width,color,background-color] duration-200 hover:w-56 hover:text-foreground focus-visible:w-56 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setCommandOpen(true)}
            aria-label="Buscar"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="ml-0 w-0 overflow-hidden whitespace-nowrap text-left text-sm opacity-0 transition-all duration-200 group-hover/search:ml-2 group-hover/search:w-40 group-hover/search:opacity-100 group-focus-visible/search:ml-2 group-focus-visible/search:w-40 group-focus-visible/search:opacity-100">
              Buscar
            </span>
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative rounded-md border border-transparent bg-secondary text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {Math.min(unreadCount, 9)}
                </span>
              )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] rounded-lg border-border bg-card p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Notificações</p>
              <p className="text-xs text-muted-foreground">Aprovações, revisões e eventos recentes.</p>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-2">
              {recentNotifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma notificação ainda.
                </div>
              ) : (
                recentNotifications.map((item) => (
                  <div key={item.id} className="rounded-xl px-3 py-3 hover:bg-background">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.message}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {formatTimestamp(item.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border p-2">
              <Button
                variant="ghost"
                className="w-full justify-between rounded-xl text-foreground hover:bg-background"
                onClick={() => router.push("/dashboard/notificacoes")}
              >
                Abrir notificações
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </PopoverContent>
          </Popover>

          <div className="flex items-center gap-3 rounded-md bg-secondary px-2 py-1.5">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{displayName}</p>
            </div>
            <Avatar className="h-8 w-8 border border-border">
              {photoUrl ? (
                <AvatarImage
                  src={photoUrl}
                  alt={displayName}
                  className="object-cover"
                  style={{
                    objectPosition: `${currentUser.accountPhotoPosition?.x ?? 50}% ${currentUser.accountPhotoPosition?.y ?? 50}%`,
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-primary/18 text-sm font-semibold text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Busca"
        description="Busque seções do painel."
        className="border-border bg-card"
      >
        <CommandInput placeholder="Buscar páginas..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Navegação">
            {availableItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  setCommandOpen(false)
                  router.push(item.href)
                }}
              >
                <item.icon className="h-4 w-4" />
                <span>{t(item.nameKey)}</span>
                {pathname === item.href ? <Badge className="ml-auto bg-primary/15 text-primary">Aberto</Badge> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
