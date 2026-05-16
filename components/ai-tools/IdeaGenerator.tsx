'use client'

import { useState } from 'react'
import type { PlanName } from '@/lib/plans'
import { canUseAITools } from '@/lib/plans'

interface IdeaItem {
  title: string
  hook: string
  description: string
}

interface Props {
  plan: PlanName
  onUseIdea: (title: string) => void
}

export default function IdeaGenerator({ plan, onUseIdea }: Props) {
  const [niche, setNiche] = useState('')
  const [platform, setPlatform] = useState('tiktok')
  const [ideas, setIdeas] = useState<IdeaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const locked = !canUseAITools(plan)

  async function handleGenerate() {
    if (!niche.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, platform }),
      })
      const data = await res.json() as { ideas?: IdeaItem[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setIdeas(data.ideas ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Idea generation failed')
    } finally {
      setLoading(false)
    }
  }

  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#fff',
    padding: '10px 12px',
    fontSize: 14,
    width: '100%',
    cursor: 'pointer',
    colorScheme: 'dark',
  }

  const optionStyle: React.CSSProperties = {
    background: '#1a1a2e',
    color: '#fff',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
    display: 'block',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }

  if (locked) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>💡</div>
        <h3 style={{ color: '#fff', marginBottom: 8, fontSize: 18, fontWeight: 600 }}>Idea Generator requires Creator plan</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>Upgrade to get AI-powered video ideas.</p>
        <a href="/billing" style={{ display: 'inline-block', padding: '10px 24px', background: 'linear-gradient(90deg,#7C3AED,#C026D3)', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Upgrade to Creator
        </a>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Niche</label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. fitness, personal finance, cooking"
              style={{ ...selectStyle, boxSizing: 'border-box' as const }}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
          </div>
          <div>
            <label style={labelStyle}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={selectStyle}>
              <option value="tiktok" style={optionStyle}>TikTok</option>
              <option value="reels" style={optionStyle}>Reels</option>
              <option value="shorts" style={optionStyle}>Shorts</option>
              <option value="youtube" style={optionStyle}>YouTube</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !niche.trim()}
          style={{
            padding: '10px 20px',
            background: loading || !niche.trim() ? 'rgba(168,85,247,0.3)' : 'linear-gradient(90deg,#7C3AED,#C026D3)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: loading || !niche.trim() ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            height: 42,
          }}
        >
          {loading ? 'Generating...' : 'Generate Ideas'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#FCA5A5', fontSize: 14 }}>
          {error}
        </div>
      )}

      {ideas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ideas.map((idea, i) => (
            <div
              key={i}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 18px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: 15, marginBottom: 6 }}>{idea.title}</div>
                  <div style={{ color: '#A855F7', fontSize: 13, marginBottom: 6, fontStyle: 'italic' }}>"{idea.hook}"</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{idea.description}</div>
                </div>
                <button
                  onClick={() => onUseIdea(idea.title)}
                  style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 6, color: '#A855F7', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Use this idea →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
