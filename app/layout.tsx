import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PreventZoom from '@/components/PreventZoom'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ViralHook — AI Viral Shorts Generator',
  description: 'Turn long videos into viral shorts using AI.',
  icons: {
    icon: '/fav-icon.png',
    apple: '/fav-icon.png',
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
