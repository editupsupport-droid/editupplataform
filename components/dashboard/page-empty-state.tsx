"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

type PageEmptyStateProps = {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function PageEmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: PageEmptyStateProps) {
  const actionButton = actionLabel ? (
    <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onAction}>
      {actionLabel}
    </Button>
  ) : null

  return (
    <Empty className="rounded-2xl border border-dashed border-border bg-card/60 py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-14 rounded-2xl bg-primary/10 text-primary">
          {icon}
        </EmptyMedia>
        <EmptyTitle className="text-foreground">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {(actionHref || actionButton) && (
        <EmptyContent>
          {actionHref && actionLabel ? <Link href={actionHref}>{actionButton}</Link> : actionButton}
        </EmptyContent>
      )}
    </Empty>
  )
}
