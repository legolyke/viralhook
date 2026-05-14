'use client'
import { useState } from 'react'
import ReanalyzeButton from './ReanalyzeButton'
import ExportModal from './ExportModal'

interface Clip {
  id: string
  title: string
  start_time: number
  end_time: number
  virality_score: number
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
  const durationMs = clip.end_time - clip.start_time
  const durationSec = Math.round(durationMs / 1000)

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
          <p style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 14, margin: 0, lineHeight: 1.4 }}>
            {clip.title}
          </p>
          <span
            title={
              clip.virality_score >= 0.8
                ? 'Viral Score: High — AI predicts strong viral potential on TikTok, Reels & Shorts'
                : clip.virality_score >= 0.6
                ? 'Viral Score: Medium — moderate viral potential'
                : 'Viral Score: Low — less likely to go viral'
            }
            style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: clip.virality_score >= 0.8 ? '#4ADE80' : clip.virality_score >= 0.6 ? '#FCD34D' : '#C084FC',
              background: clip.virality_score >= 0.8 ? 'rgba(34,197,94,0.1)' : clip.virality_score >= 0.6 ? 'rgba(234,179,8,0.1)' : 'rgba(168,85,247,0.1)',
              padding: '2px 8px',
              borderRadius: 20,
              cursor: 'help',
            }}
          >
            {Math.round(clip.virality_score * 100)}%
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <span>⏱ {formatMs(clip.start_time)} – {formatMs(clip.end_time)}</span>
          <span>({durationSec}s)</span>
        </div>

        <button
          type="button"
          onClick={() => setShowExport(true)}
          style={{
            width: '100%',
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
      </div>

      {showExport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <ExportModal
            clipId={clip.id}
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
            Analysis failed
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
