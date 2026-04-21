"use client"

import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"

type PageLoadingStateProps = {
  title: string
  description: string
}

export function PageLoadingState({ title, description }: PageLoadingStateProps) {
  return (
    <Card className="border-border bg-card/80">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background">
          <Spinner className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
