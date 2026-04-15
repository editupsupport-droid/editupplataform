import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardAccessGuard } from "@/components/dashboard/access-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen p-4 pt-20 lg:p-8 lg:pt-8">
          <DashboardAccessGuard>{children}</DashboardAccessGuard>
        </div>
      </main>
    </div>
  )
}
