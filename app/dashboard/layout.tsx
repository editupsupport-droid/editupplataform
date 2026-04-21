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
      <main className="min-h-screen lg:pl-72">
        <div className="min-h-screen px-4 pb-8 pt-20 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="mx-auto w-full max-w-[1360px]">
          <DashboardAccessGuard>{children}</DashboardAccessGuard>
          </div>
        </div>
      </main>
    </div>
  )
}
