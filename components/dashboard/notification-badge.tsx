"use client"

type NotificationBadgeProps = {
  count: number
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count <= 0) return null

  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[0.7rem] font-semibold leading-none text-white shadow-[0_0_0_2px_rgba(5,5,5,0.9)]">
      {count > 99 ? "99+" : count}
    </span>
  )
}
