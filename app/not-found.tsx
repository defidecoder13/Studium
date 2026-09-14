import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-mono text-sm font-bold">404</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-display font-semibold tracking-tight">Page not found</h2>
        <p className="text-sm text-muted-foreground">The page you’re looking for doesn’t exist or was moved.</p>
      </div>
      <Link href="/">
        <Button className="rounded-lg">Back to home</Button>
      </Link>
    </div>
  )
}
