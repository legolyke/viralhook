interface PageHeaderProps {
  title: string
  description?: string
  breadcrumb: string
}

export default function PageHeader({ title, description, breadcrumb }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>{breadcrumb}</p>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{title}</h1>
      {description && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{description}</p>
      )}
    </div>
  )
}
