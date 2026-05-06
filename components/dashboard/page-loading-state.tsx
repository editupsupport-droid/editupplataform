"use client"

import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type PageLoadingStateProps = {
  title: string
  description: string
}

export function PageLoadingState({ title, description }: PageLoadingStateProps) {
  return (
    <Card className="border-border bg-card/80">
      <CardContent className="py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-3/4" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-background/70 p-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card">
              <Spinner className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
