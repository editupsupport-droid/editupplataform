"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { CheckCircle2, ClipboardList, Minimize2, X } from "lucide-react"
import { useAppSession } from "@/components/app/app-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  getCachedWorkspaceClients,
  getCachedWorkspaceTasks,
  subscribeWorkspaceSync,
} from "@/lib/workspace-db"
import { planMeets } from "@/lib/app-data"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "editup-essential-onboarding"
const MINIMIZED_KEY = "editup-essential-onboarding-minimized"

const baseTasks = [
  { id: "client", title: "Criar Cliente", href: "/dashboard/clientes" },
  { id: "schedule", title: "Criar Produção", href: "/dashboard/kanban" },
  { id: "jobs", title: "Ver Vagas", href: "/dashboard/vagas" },
  { id: "profile", title: "Editar Página Profissional", href: "/dashboard/perfil" },
  { id: "pack", title: "Ver Pack de Edição", href: "/dashboard/pack" },
] as const

export function FreeTrialTasksWidget() {
  const router = useRouter()
  const pathname = usePathname()
  const { currentUser } = useAppSession()
  const [minimized, setMinimized] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(MINIMIZED_KEY) === "true" : false
  )
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]
    } catch {
      return []
    }
  })

  const persistCompleted = (ids: string[]) => {
    const unique = Array.from(new Set(ids))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique))
    setCompletedIds(unique)
  }

  useEffect(() => {
    if (!currentUser || !planMeets(currentUser.plan, "essential")) return

    const next = [...completedIds]
    const add = (id: string) => {
      if (!next.includes(id)) next.push(id)
    }

    if (pathname === "/dashboard/vagas") add("jobs")
    if (pathname === "/dashboard/perfil") add("profile")
    if (pathname === "/dashboard/pack") add("pack")

    const clients = getCachedWorkspaceClients(currentUser.id)
    const tasks = getCachedWorkspaceTasks(currentUser.id)
    if (clients && clients.length > 0) add("client")
    if (tasks && tasks.length > 0) add("schedule")

    if (next.length !== completedIds.length) {
      persistCompleted(next)
    }

    return subscribeWorkspaceSync(() => {
      const synced = [...next]
      const syncedClients = getCachedWorkspaceClients(currentUser.id)
      const syncedTasks = getCachedWorkspaceTasks(currentUser.id)
      if (syncedClients && syncedClients.length > 0 && !synced.includes("client")) synced.push("client")
      if (syncedTasks && syncedTasks.length > 0 && !synced.includes("schedule")) synced.push("schedule")
      if (synced.length !== completedIds.length) {
        persistCompleted(synced)
      }
    })
  }, [completedIds, currentUser, pathname])

  const tasks = useMemo(
    () => baseTasks.map((task) => ({ ...task, completed: completedIds.includes(task.id) })),
    [completedIds]
  )

  if (!currentUser || !planMeets(currentUser.plan, "essential")) return null

  const completedCount = tasks.filter((task) => task.completed).length

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(MINIMIZED_KEY, "false")
          setMinimized(false)
        }}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-2xl"
        aria-label="Abrir onboarding Essential"
      >
        <ClipboardList className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[21rem]">
      <Card className="border-border bg-card shadow-2xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base text-foreground">Essential Setup</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{completedCount}/5 concluído</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                window.localStorage.setItem(MINIMIZED_KEY, "true")
                setMinimized(true)
              }}
              aria-label="Minimizar onboarding"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                window.localStorage.setItem(MINIMIZED_KEY, "true")
                setMinimized(true)
              }}
              aria-label="Fechar onboarding"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={(completedCount / tasks.length) * 100} />
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => router.push(task.href)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/50",
                task.completed && "text-muted-foreground"
              )}
            >
              <span>{task.title}</span>
              {task.completed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
