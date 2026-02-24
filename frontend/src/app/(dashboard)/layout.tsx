import Sidebar from "@/components/dashboard/Sidebar"
import TopNav from "@/components/dashboard/TopNav"
import { AuthGuard } from "@/components/auth/auth-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="dashboard-theme flex h-[100dvh] overflow-hidden bg-white font-sans text-gray-800">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto bg-[#fdfbf7]">
            <div className="mx-auto w-full px-6 py-8 md:px-10 md:py-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
