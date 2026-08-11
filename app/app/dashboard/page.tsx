import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { ModernDashboard } from '@/components/dashboard/modern-dashboard'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user

  return (
    <div className="p-6 md:p-8">
      <ModernDashboard user={user || undefined} />
    </div>
  )
}

