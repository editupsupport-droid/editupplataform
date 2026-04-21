"use client"

import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type FeedbackBannerProps = {
  message: string
  type?: "success" | "error" | "info"
  className?: string
}

export function FeedbackBanner({
  message,
  type = "info",
  className,
}: FeedbackBannerProps) {
  if (!message.trim()) return null

  const Icon = type === "success" ? CheckCircle2 : type === "error" ? AlertCircle : Info

  return (
    <Alert
      variant={type === "error" ? "destructive" : "default"}
      className={cn(
        "rounded-2xl border",
        type === "success" && "border-primary/25 bg-primary/8 text-foreground [&>svg]:text-primary",
        type === "info" && "border-border bg-card/80 text-foreground [&>svg]:text-primary",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <AlertTitle>{type === "success" ? "Tudo certo" : type === "error" ? "Algo precisa de atenção" : "Aviso"}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
