import {
  Bell,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  ClipboardList,
  HardDrive,
  Instagram,
  LayoutDashboard,
  Package,
  Store,
  User,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { PlanId } from "@/lib/app-data"

export type DashboardNavNameKey =
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
  | "reelsCourse"
  | "outreach"

export type DashboardNavItem = {
  nameKey: DashboardNavNameKey
  href: string
  icon: LucideIcon
  minimumPlan: PlanId
  isNotification?: boolean
}

export const dashboardNavItems: DashboardNavItem[] = [
  { nameKey: "dashboard", href: "/dashboard", icon: LayoutDashboard, minimumPlan: "essential" },
  { nameKey: "clients", href: "/dashboard/clientes", icon: User, minimumPlan: "essential" },
  { nameKey: "schedule", href: "/dashboard/kanban", icon: CalendarDays, minimumPlan: "essential" },
  { nameKey: "notifications", href: "/dashboard/notificacoes", icon: Bell, minimumPlan: "essential", isNotification: true },
  { nameKey: "quotes", href: "/dashboard/orcamentos", icon: ClipboardList, minimumPlan: "essential" },
  { nameKey: "finance", href: "/dashboard/financeiro", icon: Wallet, minimumPlan: "essential" },
  { nameKey: "calculator", href: "/dashboard/calculadora", icon: Calculator, minimumPlan: "free" },
  { nameKey: "jobs", href: "/dashboard/vagas", icon: BriefcaseBusiness, minimumPlan: "essential" },
  { nameKey: "pack", href: "/dashboard/pack", icon: Package, minimumPlan: "starter" },
  { nameKey: "exchange", href: "/dashboard/exchange", icon: Store, minimumPlan: "starter" },
  { nameKey: "drive", href: "/dashboard/drive", icon: HardDrive, minimumPlan: "starter" },
  { nameKey: "reelsCourse", href: "/dashboard/curso-reels", icon: Video, minimumPlan: "essential" },
  { nameKey: "outreach", href: "/dashboard/prospeccao", icon: Instagram, minimumPlan: "essential" },
]
