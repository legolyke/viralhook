'use client'

import { useState, useEffect, useRef } from 'react'
import type { PlanName } from '@/lib/plans'
import { canUseVoiceover } from '@/lib/plans'

const VOICES = [
  { id: 'alloy', label: 'Alloy', description: 'Neutral' },
  { id: 'echo', label: 'Echo', description: 'Male' },
  { id: 'fable', label: 'Fable', description: 'Storyteller' },
  { id: 'onyx', label: 'Onyx', description: 'Deep' },
  { id: 'nova', label: 'Nova', description: 'Female' },
  { id: 'shimmer', label: 'Shimmer', description: 'Soft' },
] as const

const MAX_CHARS = 4000

interface Props {
  plan: PlanName
  voiceoverUsed: number
  voiceoverLimit: number
  initialText?: string
  onTextUsed?: () => void
}

export default function VoiceoverGenerator({ plan, voiceoverUsed: initialUsed, voiceoverLimit, initialText = '', onTextUsed }: Props) {
  const [text, setText] = useState(initialText)
  const [voice, setVoice] = useState<string>('nova')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [usedCount, setUsedCount] = useState(initialUsed)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (initialText) {
      setText(initialText)
      onTextUsed?.()
    }
  }, [initialText, onTextUsed])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const locked = !canUseVoiceover(plan)
  const atLimit = usedCount >= voiceoverLimit

  async function handleGenerate() {
    if (!text.trim() || loading || atLimit) return
    setLoading(true)
    setError('')
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl('')
    }

    try {
      const res = await fetch('/api/ai/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, MAX_CHARS), voice }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        if (data.error === 'voiceover_limit_reached') {
          setUsedCount(voiceoverLimit)
          throw new Error('Monthly voiceover limit reached. Upgrade your plan for more.')
        }
        throw new Error(data.error ?? 'Generation failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setUsedCount(c => c + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voiceover generation failed')
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = 'voiceover.mp3'
    a.click()
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
        <div style={{ fontSize: 32, marginBottom: 16 }}>🎙️</div>
        <h3 style={{ color: '#fff', marginBottom: 8, fontSize: 18, fontWeight: 600 }}>Voiceover AI requires Pro plan</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>
          Get 50 voiceovers/month with Pro, 300/month with Agency.
        </p>
        <a href="/billing" style={{ display: 'inline-block', padding: '10px 24px', background: 'linear-gradient(90deg,#7C3AED,#C026D3)', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Upgrade to Pro
        </a>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Usage counter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{
          fontSize: 12,
          color: atLimit ? '#FCA5A5' : 'rgba(255,255,255,0.4)',
          background: atLimit ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
          padding: '4px 10px',
          borderRadius: 20,
        }}>
          {usedCount} / {voiceoverLimit} voiceovers used this month
        </span>
      </div>

      {/* Text input */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Script</label>
          <span style={{ fontSize: 11, color: text.length > MAX_CHARS * 0.9 ? '#FCA5A5' : 'rgba(255,255,255,0.3)' }}>
            {text.length} / {MAX_CHARS}
          </span>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={8}
          placeholder="Paste your script here or generate one from the Script tab"
          style={{ ...selectStyle, boxSizing: 'border-box' as const, resize: 'vertical' as const, lineHeight: 1.6 }}
        />
      </div>

      {/* Voice selector */}
      <div>
        <label style={labelStyle}>Voice</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {VOICES.map(v => (
            <button
              key={v.id}
              onClick={() => setVoice(v.id)}
              style={{
                background: voice === v.id ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                border: voice === v.id ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color: voice === v.id ? '#A855F7' : 'rgba(255,255,255,0.6)',
                padding: '8px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v.label}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{v.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !text.trim() || atLimit}
        style={{
          padding: '12px 24px',
          background: loading || !text.trim() || atLimit ? 'rgba(168,85,247,0.3)' : 'linear-gradient(90deg,#7C3AED,#C026D3)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          cursor: loading || !text.trim() || atLimit ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Generating...' : atLimit ? 'Monthly limit reached' : 'Generate Voiceover'}
      </button>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#FCA5A5', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Audio output */}
      {audioUrl && (
        <div style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 10, padding: '16px 18px' }}>
          <label style={labelStyle}>Generated Voiceover</label>
          <audio ref={audioRef} src={audioUrl} controls style={{ width: '100%', marginBottom: 12 }} />
          <button
            onClick={handleDownload}
            style={{ background: 'linear-gradient(90deg,#7C3AED,#C026D3)', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Download MP3
          </button>
        </div>
      )}
    </div>
  )
}
