'use client'

import { useState } from 'react'
import type { AssemblyAIHighlight } from '@/lib/assemblyai'

interface TranscriptData {
  full_text: string
  content: {
    words: Array<{ text: string; start: number; end: number; confidence: number }>
    auto_highlights: AssemblyAIHighlight[]
  }
  language: string
}

interface TranscriptPanelProps {
  status: string
  transcript: TranscriptData | null
  projectId: string
}

function applyHighlights(fullText: string, highlights: AssemblyAIHighlight[]): React.ReactNode {
  const topPhrases = highlights
    .filter(h => h.rank > 0.7)
    .sort((a, b) => b.rank - a.rank)
    .map(h => h.text)

  if (topPhrases.length === 0) return fullText

  const escaped = topPhrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')
  const parts = fullText.split(pattern)

  return (
    <>
      {parts.map((part, i) => {
        const isHighlight = topPhrases.some(p => p.toLowerCase() === part.toLowerCase())
        return isHighlight ? (
          <mark
            key={i}
            style={{
              background: 'rgba(168,85,247,0.22)',
              borderBottom: '1px solid rgba(168,85,247,0.55)',
              borderRadius: 3,
              padding: '0 2px',
              color: '#E9D5FF',
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      })}
    </>
  )
}

export default function TranscriptPanel({ status, transcript, projectId }: TranscriptPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedText, setSavedText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (status === 'transcribing') {
    return (
      <div
        style={{
          marginTop: 20,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(168,85,247,0.12)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(168,85,247,0.3)',
            borderTopColor: '#A855F7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            flexShrink: 0,
          }}
        />
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, margin: 0 }}>
            Transcribing audio...
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '2px 0 0' }}>
            This may take a few minutes.
          </p>
        </div>
      </div>
    )
  }

  if (!transcript?.full_text) return null

  const highlights = transcript.content?.auto_highlights ?? []
  const highlightCount = highlights.filter(h => h.rank > 0.7).length
  const displayText = savedText ?? transcript.full_text

  function handleEdit() {
    setEditedText(displayText)
    setEditing(true)
    setError(null)
  }

  function handleCancel() {
    setEditing(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/transcript`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_text: editedText }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Save failed')
      }
      setSavedText(editedText)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        marginTop: 20,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
        }}
      >
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.7)',
            padding: 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>Transcript</span>
          {highlightCount > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 20,
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#C084FC',
                fontWeight: 500,
              }}
            >
              {highlightCount} viral moment{highlightCount !== 1 ? 's' : ''}
            </span>
          )}
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {expanded && !editing && (
          <button
            onClick={handleEdit}
            style={{
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: 6,
              color: '#C084FC',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        )}

        {editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCancel}
              disabled={saving}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.4)',
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saving ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.8)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 16px' }}>
          {/* Warning message */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              background: 'rgba(234,179,8,0.08)',
              border: '1px solid rgba(234,179,8,0.2)',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13, flexShrink: 0 }}>⚠</span>
            <p style={{ fontSize: 12, color: 'rgba(234,179,8,0.85)', margin: 0, lineHeight: 1.5 }}>
              AI transcription may contain errors. Review and edit before burning subtitles into your video.
            </p>
          </div>

          {editing ? (
            <>
              <textarea
                value={editedText}
                onChange={e => setEditedText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 140,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(168,85,247,0.35)',
                  borderRadius: 8,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 13,
                  lineHeight: 1.75,
                  padding: '10px 12px',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              {error && (
                <p style={{ color: '#F87171', fontSize: 12, margin: '6px 0 0' }}>{error}</p>
              )}
            </>
          ) : (
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.75,
                color: 'rgba(255,255,255,0.6)',
                margin: 0,
              }}
            >
              {applyHighlights(displayText, highlights)}
            </p>
          )}

          {!editing && highlightCount > 0 && (
            <p style={{ fontSize: 11, color: 'rgba(168,85,247,0.6)', marginTop: 10, marginBottom: 0 }}>
              Highlighted phrases detected as high viral potential by AI
            </p>
          )}
        </div>
      )}
    </div>
  )
}
