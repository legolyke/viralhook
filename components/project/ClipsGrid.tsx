'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReanalyzeButton from './ReanalyzeButton'
import ExportModal from './ExportModal'

type CaptionPlatform = 'tiktok' | 'reels' | 'shorts' | 'youtube'

const PLATFORMS: { value: CaptionPlatform; label: string }[] = [
  { value: 'tiktok',   label: 'TikTok'   },
  { value: 'reels',    label: 'Reels'    },
  { value: 'shorts',   label: 'Shorts'   },
  { value: 'youtube',  label: 'YouTube'  },
]

interface ScoreComponent {
  score: number
  reason: string
}

interface ScoreBreakdown {
  hook:          ScoreComponent
  emotion:       ScoreComponent
  pacing:        ScoreComponent
  shareability:  ScoreComponent
}

interface Clip {
  id: string
  title: string
  start_time: number
  end_time: number
  virality_score: number
  score_breakdown: ScoreBreakdown | null
  file_url: string | null
  status: string
}

interface ClipsGridProps {
  projectStatus: string
  projectId: string
  projectFileUrl: string
  clips: Clip[]
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ClipCard({
  clip,
  projectFileUrl,
}: {
  clip: Clip
  projectFileUrl: string
}) {
  const [showExport, setShowExport] = useState(false)
  const [showCaption, setShowCaption] = useState(false)
  const [showScoreTooltip, setShowScoreTooltip] = useState(false)
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null)
  const scoreRef = useRef<HTMLDivElement>(null)

  const BREAKDOWN_LABELS: Record<string, string> = {
    hook: 'Hook', emotion: 'Emotion', pacing: 'Pacing', shareability: 'Share',
  }

  const BREAKDOWN_DEFS: Record<string, string> = {
    hook:          'How strong the opening seconds are at grabbing attention',
    emotion:       'How much emotion and energy the clip conveys',
    pacing:        'How well-timed the clip is — not too slow, not too fast',
    shareability:  'How likely viewers are to share or forward this clip',
  }

  useEffect(() => {
    if (!showScoreTooltip) return
    const close = (e: MouseEvent | TouchEvent) => {
      if (scoreRef.current && !scoreRef.current.contains(e.target as Node)) {
        setShowScoreTooltip(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [showScoreTooltip])
  const [platform, setPlatform] = useState<CaptionPlatform>('tiktok')
  const [caption, setCaption] = useState<string | null>(null)
  const [captionLoading, setCaptionLoading] = useState(false)
  const [captionError, setCaptionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [currentTitle, setCurrentTitle] = useState(clip.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState(clip.title)
  const [titleSaving, setTitleSaving] = useState(false)

  const durationMs = clip.end_time - clip.start_time
  const durationSec = Math.round(durationMs / 1000)

  async function saveTitle() {
    const trimmed = editTitleValue.trim()
    if (!trimmed || trimmed === currentTitle) {
      setEditingTitle(false)
      setEditTitleValue(currentTitle)
      return
    }
    setTitleSaving(true)
    try {
      const res = await fetch(`/api/clips/${clip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })
      const d = await res.json() as { title?: string; error?: string }
      if (res.ok && d.title) {
        setCurrentTitle(d.title)
        setEditTitleValue(d.title)
      } else {
        setEditTitleValue(currentTitle)
      }
    } catch {
      setEditTitleValue(currentTitle)
    } finally {
      setTitleSaving(false)
      setEditingTitle(false)
    }
  }

  async function handleGenerate() {
    setCaptionLoading(true)
    setCaptionError(null)
    setCaption(null)
    try {
      const res = await fetch(`/api/clips/${clip.id}/caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
      const d = await res.json() as { caption?: string; error?: string }
      if (!res.ok) throw new Error(d.error ?? 'Generation failed')
      setCaption(d.caption ?? '')
    } catch (e) {
      setCaptionError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setCaptionLoading(false)
    }
  }

  async function handleCopy() {
    if (!caption) return
    await navigator.clipboard.writeText(caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleToggleCaption() {
    setShowCaption(v => !v)
    if (showCaption) {
      setCaption(null)
      setCaptionError(null)
    }
  }

  return (
    <>
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(168,85,247,0.15)',
          borderRadius: 12,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          {editingTitle ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
              <input
                autoFocus
                value={editTitleValue}
                onChange={e => setEditTitleValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') { setEditingTitle(false); setEditTitleValue(currentTitle) }
                }}
                disabled={titleSaving}
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#E9D5FF',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(168,85,247,0.4)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  outline: 'none',
                  minWidth: 0,
                }}
              />
              <button
                type="button"
                onClick={saveTitle}
                disabled={titleSaving}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'rgba(168,85,247,0.7)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: titleSaving ? 'wait' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {titleSaving ? '...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditingTitle(false); setEditTitleValue(currentTitle) }}
                disabled={titleSaving}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <p style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 14, margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTitle}
              </p>
              <button
                type="button"
                onClick={() => { setEditingTitle(true); setEditTitleValue(currentTitle) }}
                style={{
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 5,
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: '2px 7px',
                  fontSize: 10,
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                Edit
              </button>
            </div>
          )}
          <div ref={scoreRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setShowScoreTooltip(v => !v)}
              style={{
                background: clip.virality_score >= 0.8 ? 'rgba(34,197,94,0.1)' : clip.virality_score >= 0.6 ? 'rgba(234,179,8,0.1)' : 'rgba(168,85,247,0.1)',
                border: 'none',
                borderRadius: 20,
                color: clip.virality_score >= 0.8 ? '#4ADE80' : clip.virality_score >= 0.6 ? '#FCD34D' : '#C084FC',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 8px',
              }}
            >
              {Math.round(clip.virality_score * 100)}%
            </button>
            {showScoreTooltip && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                right: 0,
                zIndex: 100,
                background: '#1A1A2E',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: 8,
                padding: '8px 10px',
                width: 200,
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              }}>
                <p style={{ color: '#E9D5FF', fontSize: 12, fontWeight: 700, margin: '0 0 4px' }}>
                  {clip.virality_score >= 0.8 ? 'High Viral Potential' : clip.virality_score >= 0.6 ? 'Medium Viral Potential' : 'Low Viral Potential'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                  {clip.virality_score >= 0.8
                    ? 'AI predicts strong viral potential on TikTok, Reels & Shorts.'
                    : clip.virality_score >= 0.6
                    ? 'Moderate viral potential — worth testing on social media.'
                    : 'Lower viral potential based on AI analysis.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <span>⏱ {formatMs(clip.start_time)} – {formatMs(clip.end_time)}</span>
          <span>({durationSec}s)</span>
        </div>

        {/* Breakdown chips */}
        {clip.score_breakdown && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {(Object.keys(clip.score_breakdown) as (keyof ScoreBreakdown)[]).map((key) => {
                const comp = clip.score_breakdown![key]
                const color = comp.score >= 0.8 ? '#4ADE80' : comp.score >= 0.6 ? '#FCD34D' : '#C084FC'
                const bg    = comp.score >= 0.8 ? 'rgba(34,197,94,0.1)' : comp.score >= 0.6 ? 'rgba(234,179,8,0.1)' : 'rgba(168,85,247,0.1)'
                const isActive = activeBreakdown === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveBreakdown(isActive ? null : key)}
                    style={{
                      background: bg,
                      border: 'none',
                      borderRadius: 20,
                      color,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                    }}
                  >
                    {BREAKDOWN_LABELS[key]} {Math.round(comp.score * 100)}% {isActive ? '▲' : '▼'}
                  </button>
                )
              })}
            </div>

            {activeBreakdown && clip.score_breakdown[activeBreakdown as keyof ScoreBreakdown] && (
              <div style={{
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(168,85,247,0.15)',
                borderRadius: 8,
              }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 4px', lineHeight: 1.4 }}>
                  <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{BREAKDOWN_LABELS[activeBreakdown]}</strong> — {BREAKDOWN_DEFS[activeBreakdown]}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
                  &ldquo;{clip.score_breakdown[activeBreakdown as keyof ScoreBreakdown].reason}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowExport(true)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(192,38,211,0.15))',
              border: '1px solid rgba(168,85,247,0.3)',
              color: '#C084FC',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleToggleCaption}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 8,
              background: showCaption ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${showCaption ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: showCaption ? '#A5B4FC' : 'rgba(255,255,255,0.4)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Caption
          </button>
        </div>

        {/* Caption panel */}
        {showCaption && (
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Platform selector */}
            <div style={{ display: 'flex', gap: 6 }}>
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setPlatform(p.value); setCaption(null); setCaptionError(null) }}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    borderRadius: 6,
                    border: `1px solid ${platform === p.value ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    background: platform === p.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                    color: platform === p.value ? '#A5B4FC' : 'rgba(255,255,255,0.35)',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Generate button */}
            {!caption && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={captionLoading}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 8,
                  background: captionLoading ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.7)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: captionLoading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {captionLoading && (
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                )}
                {captionLoading ? 'Generating...' : 'Generate Caption'}
              </button>
            )}

            {/* Error */}
            {captionError && (
              <p style={{ color: '#F87171', fontSize: 11, margin: 0 }}>{captionError}</p>
            )}

            {/* Generated caption */}
            {caption && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: 'rgba(255,255,255,0.75)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {caption}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: 7,
                      background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: copied ? '#4ADE80' : 'rgba(255,255,255,0.5)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={captionLoading}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: 7,
                      background: 'rgba(99,102,241,0.1)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      color: '#A5B4FC',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: captionLoading ? 'wait' : 'pointer',
                    }}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showExport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <ExportModal
            clipId={clip.id}
            clipTitle={clip.title ?? ''}
            startTime={clip.start_time}
            endTime={clip.end_time}
            projectFileUrl={projectFileUrl}
            onClose={() => setShowExport(false)}
          />
        </div>
      )}
    </>
  )
}

export default function ClipsGrid({ projectStatus, projectId, projectFileUrl, clips }: ClipsGridProps) {
  const router = useRouter()
  const autoDetectFired = useRef(false)
  const [autoDetecting, setAutoDetecting] = useState(false)

  useEffect(() => {
    if (projectStatus !== 'ready' || clips.length > 0) return
    if (autoDetectFired.current) return
    autoDetectFired.current = true
    setAutoDetecting(true)
    fetch(`/api/projects/${projectId}/detect-clips`, { method: 'POST' })
      .then(() => router.refresh())
      .catch(console.error)
      .finally(() => setAutoDetecting(false))
  }, [projectStatus, projectId, clips.length, router])

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 16, margin: 0 }}>
          AI Clips
        </h3>
        {projectStatus === 'ready' && clips.length > 0 && (
          <ReanalyzeButton projectId={projectId} />
        )}
      </div>

      {projectStatus !== 'ready' ? (
        <div
          style={{
            padding: '32px 24px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed rgba(168,85,247,0.15)',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>
            AI analysis will start once the video is processed.
          </p>
        </div>
      ) : clips.length === 0 ? (
        <div
          style={{
            padding: '32px 24px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed rgba(168,85,247,0.15)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>
            {autoDetecting ? 'Detecting clips...' : 'Analysis failed'}
          </p>
          <ReanalyzeButton projectId={projectId} />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
          className="clips-grid"
        >
          {[...clips].sort((a, b) => b.virality_score - a.virality_score).map((clip) => (
            <ClipCard key={clip.id} clip={clip} projectFileUrl={projectFileUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
