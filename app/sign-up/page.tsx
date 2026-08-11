import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'

export default async function SignUpPage() {
  let session = null
  try {
    session = await auth.api.getSession({ headers: await headers() })
  } catch (error) {
    // ignore
  }
  if (session?.user) {
    redirect('/app/dashboard')
  }
  return <AuthForm mode="sign-up" />
}
