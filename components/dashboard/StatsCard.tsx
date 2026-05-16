interface StatsCardProps {
  label: string
  value: number
  limit?: number
  unit?: string
}

export default function StatsCard({ label, value, limit, unit }: StatsCardProps) {
  const pct = limit ? Math.min(Math.round((value / limit) * 100), 100) : null

  return (
    <div style={{ padding: '18px 20px', borderRadius: 16, background: '#111114', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
        {value}
        {limit != null && (
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}> / {limit}</span>
        )}
        {unit && limit == null && (
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}> {unit}</span>
        )}
      </div>
      {pct !== null && (
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 12 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#22D3EE,#8B5CF6)', borderRadius: 2, boxShadow: '0 0 8px rgba(34,211,238,0.3)' }} />
        </div>
      )}
    </div>
  )
}
