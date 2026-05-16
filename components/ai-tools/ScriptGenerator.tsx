'use client'

import { useState, useEffect } from 'react'
import type { PlanName } from '@/lib/plans'
import { canUseAITools } from '@/lib/plans'

interface Props {
  plan: PlanName
  initialTopic?: string
  onTopicUsed?: () => void
  onSendToVoiceover: (script: string) => void
}

export default function ScriptGenerator({ plan, initialTopic = '', onTopicUsed, onSendToVoiceover }: Props) {
  const [topic, setTopic] = useState(initialTopic)
  const [platform, setPlatform] = useState('tiktok')
  const [duration, setDuration] = useState('60s')
  const [tone, setTone] = useState('educational')
  const [script, setScript] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic)
      onTopicUsed?.()
    }
  }, [initialTopic, onTopicUsed])

  const locked = !canUseAITools(plan)

  async function handleGenerate() {
    if (!topic.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, platform, duration, tone }),
      })
      const data = await res.json() as { script?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setScript(data.script ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Script generation failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        <div style={{ fontSize: 32, marginBottom: 16 }}>✨</div>
        <h3 style={{ color: '#fff', marginBottom: 8, fontSize: 18, fontWeight: 600 }}>Script Generator requires Creator plan</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>Upgrade to generate viral scripts with AI.</p>
        <a href="/billing" style={{ display: 'inline-block', padding: '10px 24px', background: 'linear-gradient(90deg,#7C3AED,#C026D3)', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Upgrade to Creator
        </a>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Topic */}
      <div>
        <label style={labelStyle}>Topic</label>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. How to lose 5kg in 30 days without gym"
          style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' as const }}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
        />
      </div>

      {/* Platform + Duration + Tone row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Platform</label>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={selectStyle}>
            <option value="tiktok" style={optionStyle}>TikTok</option>
            <option value="reels" style={optionStyle}>Reels</option>
            <option value="shorts" style={optionStyle}>Shorts</option>
            <option value="youtube" style={optionStyle}>YouTube</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Duration</label>
          <select value={duration} onChange={e => setDuration(e.target.value)} style={selectStyle}>
            <option value="30s" style={optionStyle}>30 seconds</option>
            <option value="60s" style={optionStyle}>60 seconds</option>
            <option value="90s" style={optionStyle}>90 seconds</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tone</label>
          <select value={tone} onChange={e => setTone(e.target.value)} style={selectStyle}>
            <option value="funny" style={optionStyle}>Funny</option>
            <option value="educational" style={optionStyle}>Educational</option>
            <option value="motivational" style={optionStyle}>Motivational</option>
            <option value="inspirational" style={optionStyle}>Inspirational</option>
          </select>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        style={{
          padding: '12px 24px',
          background: loading || !topic.trim() ? 'rgba(168,85,247,0.3)' : 'linear-gradient(90deg,#7C3AED,#C026D3)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? 'Generating...' : 'Generate Script'}
      </button>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#FCA5A5', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Output */}
      {script && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Generated Script</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCopy}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => onSendToVoiceover(script)}
                style={{ background: 'linear-gradient(90deg,#7C3AED,#C026D3)', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Generate Voiceover →
              </button>
            </div>
          </div>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            rows={10}
            style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' as const, resize: 'vertical' as const, lineHeight: 1.6 }}
          />
        </div>
      )}
    </div>
  )
}
