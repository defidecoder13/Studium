import { getCurrentUser } from '@/lib/auth'
import { ModernDashboard } from '@/components/dashboard/modern-dashboard'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  return (
    <div className="p-6 md:p-8">
      <ModernDashboard user={user || undefined} />
    </div>
  )
}
