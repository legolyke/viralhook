interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12, padding: '44px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>{title}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>{description}</p>
      </div>
    </div>
  )
}
