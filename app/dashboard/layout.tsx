import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardAccessGuard } from "@/components/dashboard/access-guard"
import { DashboardTopbar } from "@/components/dashboard/topbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <DashboardSidebar />
      <main className="min-h-screen min-w-0 overflow-x-hidden bg-background transition-[padding] duration-300 lg:pl-[292px]">
        <div className="min-h-screen min-w-0 px-4 pb-8 pt-20 lg:px-8 lg:pb-10 lg:pt-6">
          <div className="mx-auto w-full min-w-0 max-w-[1380px]">
            <DashboardTopbar />
          </div>
          <div className="page-transition-shell mx-auto w-full min-w-0 max-w-[1380px] px-0 py-2">
            <DashboardAccessGuard>{children}</DashboardAccessGuard>
          </div>
        </div>
      </main>
    </div>
  )
}
