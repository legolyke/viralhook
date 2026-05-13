interface ClipsGridProps {
  projectStatus: string
}

function SkeletonClipCard({ index }: { index: number }) {
  const labels = ['Hook detected', 'Viral moment', 'Key insight']
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(168,85,247,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          aspectRatio: '9/16',
          background: 'rgba(168,85,247,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.3)" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-.375a1.125 1.125 0 0 1 1.125-1.125M21 10.5h.375a1.125 1.125 0 0 1 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5H18V5.625c0-.621-.504-1.125-1.125-1.125H5.625C5.004 4.5 4.5 5.004 4.5 5.625V10.5Z" />
        </svg>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
          {labels[index % labels.length]}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)' }}>
          Waiting for AI...
        </div>
      </div>
    </div>
  )
}

export default function ClipsGrid({ projectStatus }: ClipsGridProps) {
  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 16, margin: 0 }}>
          AI Clips
        </h3>
        <span
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'rgba(168,85,247,0.1)',
            color: '#C084FC',
          }}
        >
          Coming soon
        </span>
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
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
          className="clips-grid"
        >
          {[0, 1, 2].map((i) => (
            <SkeletonClipCard key={i} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
