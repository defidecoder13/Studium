/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
