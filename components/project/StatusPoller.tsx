'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLLING_STATUSES = new Set(['uploading', 'processing', 'transcribing'])

export default function StatusPoller({ status }: { status: string }) {
  const router = useRouter()

  useEffect(() => {
    if (!POLLING_STATUSES.has(status)) return
    const id = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(id)
  }, [status, router])

  return null
}
