interface StatsCardProps {
  label: string
  value: number
  limit?: number
  unit?: string
}

export default function StatsCard({ label, value, limit, unit }: StatsCardProps) {
  const pct = limit ? Math.min(Math.round((value / limit) * 100), 100) : null

  return (
    <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
        {value}
        {limit != null && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> / {limit}</span>
        )}
        {unit && limit == null && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> {unit}</span>
        )}
      </div>
      {pct !== null && (
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 10 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#7C3AED,#C026D3)', borderRadius: 2 }} />
        </div>
      )}
    </div>
  )
}
