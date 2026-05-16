import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/signup', '/login', '/privacy', '/terms'],
        disallow: ['/dashboard', '/admin', '/api/', '/auth/'],
      },
    ],
    sitemap: 'https://www.viralhook.media/sitemap.xml',
  }
}
