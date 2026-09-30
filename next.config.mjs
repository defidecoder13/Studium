/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'motion'],
  },
  images: {
    // Enable optimization for R2 + Vercel assets (was unoptimized:true)
    unoptimized: false,
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.vercel.app' },
      { protocol: 'https', hostname: 'pub-*.r2.dev' },
    ],
  },
  serverExternalPackages: ['pdf-parse', 'canvas', '@napi-rs/canvas'],
  async headers() {
    // Minimal CSP that allows Clerk + YouTube embeds + Google Fonts + R2.
    // Keep 'unsafe-inline'/'unsafe-eval' for Next.js + Clerk until fully nonced.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://*.googleapis.com https://*.gstatic.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://www.youtube.com https://www.googleapis.com",
      "frame-src 'self' https://www.youtube.com https://*.youtube-nocookie.com https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
          // HSTS only has effect on HTTPS (prod). Harmless locally.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/api/documents/file/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=3600, stale-while-revalidate=600' },
        ],
      },
    ]
  },
}

export default nextConfig
