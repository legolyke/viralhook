import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProjectHeader from '@/components/project/ProjectHeader'
import VideoPlayer from '@/components/project/VideoPlayer'
import ClipsGrid from '@/components/project/ClipsGrid'
import TranscriptPanel from '@/components/project/TranscriptPanel'
import StatusPoller from '@/components/project/StatusPoller'

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const SOURCE_LABEL: Record<string, string> = {
  file: '📁 File',
  youtube: '📺 YouTube',
  tiktok: '🎵 TikTok',
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, status, file_url, source, duration_seconds, file_size')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/dashboard')

  const { data: transcript } = await supabase
    .from('transcripts')
    .select('full_text, content, language')
    .eq('project_id', project.id)
    .maybeSingle()

  const { data: clips } = await supabase
    .from('clips')
    .select('id, title, start_time, end_time, virality_score, status, file_url')
    .eq('project_id', project.id)
    .order('virality_score', { ascending: false })

  return (
    <div className="dashboard-content" style={{ maxWidth: 900 }}>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'rgba(255,255,255,0.4)',
          textDecoration: 'none',
          marginBottom: 20,
        }}
      >
        ← Back to Dashboard
      </Link>

      <StatusPoller status={project.status} />
      <ProjectHeader id={project.id} title={project.title} status={project.status} />

      <VideoPlayer fileUrl={project.file_url ?? ''} status={project.status} projectId={project.id} durationSeconds={project.duration_seconds ?? 60} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginTop: 16,
        }}
        className="project-meta-grid"
      >
        {[
          { label: 'Source', value: SOURCE_LABEL[project.source] ?? project.source },
          { label: 'Duration', value: formatDuration(project.duration_seconds) },
          { label: 'File size', value: formatSize(project.file_size) },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#E9D5FF' }}>{value}</div>
          </div>
        ))}
      </div>

      <TranscriptPanel status={project.status} transcript={transcript} projectId={project.id} />

      <ClipsGrid
          projectStatus={project.status}
          projectId={project.id}
          projectFileUrl={project.file_url ?? ''}
          clips={clips ?? []}
        />
    </div>
  )
}
