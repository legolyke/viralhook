'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'

type TicketStatus = 'open' | 'in_progress' | 'closed'
type TicketCategory = 'bug' | 'question' | 'suggestion'

interface Ticket {
  id: string
  user_id: string
  user_email: string
  subject: string
  message: string
  category: TicketCategory
  status: TicketStatus
  admin_reply: string | null
  replied_at: string | null
  created_at: string
}

const STATUS_COLORS: Record<TicketStatus, { color: string; bg: string; label: string }> = {
  open:        { color: '#FCD34D', bg: 'rgba(234,179,8,0.12)',   label: 'Open' },
  in_progress: { color: '#60A5FA', bg: 'rgba(59,130,246,0.12)', label: 'In Progress' },
  closed:      { color: '#4ADE80', bg: 'rgba(34,197,94,0.12)',  label: 'Closed' },
}
const CATEGORY_COLORS: Record<TicketCategory, { color: string; bg: string }> = {
  bug:        { color: '#F87171', bg: 'rgba(239,68,68,0.12)' },
  question:   { color: '#C084FC', bg: 'rgba(168,85,247,0.12)' },
  suggestion: { color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
}
const CATEGORY_LABELS: Record<TicketCategory, string> = { bug: 'Bug', question: 'Question', suggestion: 'Suggestion' }

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
]

export default function AdminSupportClient({ tickets: initialTickets }: { tickets: Ticket[] }) {
  const router = useRouter()
  const [tickets, setTickets] = useState(initialTickets)
  const [filter, setFilter] = useState('open')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const displayed = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  async function handleReply(ticket: Ticket) {
    const reply = replyText[ticket.id]?.trim()
    if (!reply) return
    setSaving(p => ({ ...p, [ticket.id]: true }))
    setErrors(p => ({ ...p, [ticket.id]: '' }))
    try {
      const res = await fetch(`/api/support/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply, status: 'closed' }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, admin_reply: reply, replied_at: new Date().toISOString(), status: 'closed' } : t))
      setReplyText(p => ({ ...p, [ticket.id]: '' }))
      setExpandedId(null)
      router.refresh()
    } catch (err) {
      setErrors(p => ({ ...p, [ticket.id]: err instanceof Error ? err.message : 'Failed' }))
    } finally {
      setSaving(p => ({ ...p, [ticket.id]: false }))
    }
  }

  async function handleStatus(ticket: Ticket, status: TicketStatus) {
    setSaving(p => ({ ...p, [ticket.id]: true }))
    try {
      await fetch(`/api/support/${ticket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status } : t))
    } finally {
      setSaving(p => ({ ...p, [ticket.id]: false }))
    }
  }

  const openCount = tickets.filter(t => t.status === 'open').length

  return (
    <div className="dashboard-content" style={{ maxWidth: 900 }}>
      <PageHeader
        title="Support Inbox"
        subtitle={openCount > 0 ? `${openCount} open ticket${openCount > 1 ? 's' : ''}` : 'All tickets resolved'}
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {FILTERS.map(f => {
          const count = f.value === 'all' ? tickets.length : tickets.filter(t => t.status === f.value).length
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: filter === f.value ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filter === f.value ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: filter === f.value ? '#C084FC' : 'rgba(255,255,255,0.4)',
              }}
            >
              {f.label} {count > 0 && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(168,85,247,0.15)', borderRadius: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>No tickets here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(ticket => {
            const sc = STATUS_COLORS[ticket.status]
            const cc = CATEGORY_COLORS[ticket.category]
            const isExpanded = expandedId === ticket.id
            return (
              <div key={ticket.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${ticket.status === 'open' ? 'rgba(252,211,77,0.2)' : 'rgba(168,85,247,0.1)'}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#E9D5FF', fontSize: 13, fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>{ticket.user_email}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cc.bg, color: cc.color, flexShrink: 0 }}>{CATEGORY_LABELS[ticket.category]}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, flexShrink: 0 }}>
                    {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* User message */}
                    <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>User message</p>
                      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.message}</p>
                    </div>

                    {/* Existing reply */}
                    {ticket.admin_reply && (
                      <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }}>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Your reply</p>
                        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.admin_reply}</p>
                      </div>
                    )}

                    {/* Reply box */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        value={replyText[ticket.id] ?? ''}
                        onChange={e => setReplyText(p => ({ ...p, [ticket.id]: e.target.value }))}
                        placeholder={ticket.admin_reply ? 'Update reply...' : 'Write a reply...'}
                        rows={4}
                        style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)', color: '#E9D5FF', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                      {errors[ticket.id] && <p style={{ color: '#F87171', fontSize: 11, margin: 0 }}>{errors[ticket.id]}</p>}

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleReply(ticket)}
                          disabled={saving[ticket.id] || !replyText[ticket.id]?.trim()}
                          style={{ padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg, rgba(124,58,237,0.8), rgba(192,38,211,0.8))', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving[ticket.id] ? 'wait' : 'pointer', opacity: !replyText[ticket.id]?.trim() ? 0.5 : 1 }}
                        >
                          {saving[ticket.id] ? 'Saving...' : 'Reply & Close'}
                        </button>

                        {/* Quick status change */}
                        {ticket.status !== 'open' && (
                          <button type="button" onClick={() => handleStatus(ticket, 'open')}
                            style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(252,211,77,0.1)', border: '1px solid rgba(252,211,77,0.25)', color: '#FCD34D', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Reopen
                          </button>
                        )}
                        {ticket.status !== 'in_progress' && ticket.status !== 'closed' && (
                          <button type="button" onClick={() => handleStatus(ticket, 'in_progress')}
                            style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60A5FA', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Mark In Progress
                          </button>
                        )}
                        {ticket.status !== 'closed' && (
                          <button type="button" onClick={() => handleStatus(ticket, 'closed')}
                            style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ADE80', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
