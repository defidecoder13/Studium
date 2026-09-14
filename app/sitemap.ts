import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://studium.vercel.app'
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/sign-in`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/sign-up`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/app/dashboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/app/library`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ]
}
