import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PreventZoom from '@/components/PreventZoom'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ViralHook — AI Viral Shorts Generator',
  description: 'Upload any video. Our AI finds the most viral moments, cuts perfect 9:16 clips, adds animated subtitles, and generates captions — in minutes.',
  metadataBase: new URL('https://www.viralhook.media'),
  openGraph: {
    title: 'ViralHook — AI Viral Shorts Generator',
    description: 'Upload any video. Our AI finds the most viral moments, cuts perfect 9:16 clips, adds animated subtitles, and generates captions — in minutes.',
    url: 'https://www.viralhook.media',
    siteName: 'ViralHook',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ViralHook — AI Viral Shorts Generator',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ViralHook — AI Viral Shorts Generator',
    description: 'Upload any video. Our AI finds the most viral moments, cuts perfect 9:16 clips, adds animated subtitles, and generates captions — in minutes.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        <PreventZoom />
        {children}
      </body>
    </html>
  )
}
