"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAppSession } from "@/components/app/app-provider"
import { planMeets } from "@/lib/app-data"

const DISMISS_KEY = "editup-notification-popup-disabled"
const ASK_LATER_KEY = "editup-notification-popup-dismissed"

export function NotificationPermissionPopup() {
  const pathname = usePathname()
  const { currentUser } = useAppSession()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (!pathname.startsWith("/dashboard")) return
    if (!currentUser || !planMeets(currentUser.plan, "essential")) return
    if (window.localStorage.getItem(DISMISS_KEY) === "true") return
    if (Notification.permission === "granted" || Notification.permission === "denied") return
    if (window.localStorage.getItem(ASK_LATER_KEY) === "true") return

    const timeoutId = window.setTimeout(() => setIsVisible(true), 600)
    return () => window.clearTimeout(timeoutId)
  }, [currentUser, pathname])

  const close = () => setIsVisible(false)

  const handleEnable = async () => {
    if (!("Notification" in window)) return
    await Notification.requestPermission()
    close()
  }

  const handleCancel = () => {
    window.localStorage.setItem(ASK_LATER_KEY, "true")
    close()
  }

  const handleDontAskAgain = () => {
    window.localStorage.setItem(DISMISS_KEY, "true")
    close()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Habilitar notificações?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Receba alertas sobre vídeos próximos do prazo, aprovações, pedidos de ajuste e avisos importantes da plataforma.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="accent-primary"
              onChange={(event) => {
                if (event.target.checked) {
                  handleDontAskAgain()
                }
              }}
            />
            Não me enviem mais isto
          </label>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" className="border-border" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => void handleEnable()}>
              Habilitar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
