'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReanalyzeButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReanalyze() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/detect-clips`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; count?: number; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Re-analysis failed')
      } else {
        router.refresh()
      }
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <button
        type="button"
        onClick={handleReanalyze}
        disabled={loading}
        style={{
          padding: '8px 20px',
          borderRadius: 8,
          background: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.25)',
          color: '#C084FC',
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Analyzing...' : 'Re-analyze'}
      </button>
      {error && (
        <p style={{ color: '#F87171', fontSize: 12, marginTop: 8 }}>{error}</p>
      )}
    </div>
  )
}
