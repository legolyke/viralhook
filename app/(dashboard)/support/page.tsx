'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/dashboard/PageHeader'

type TicketStatus = 'open' | 'in_progress' | 'closed'
type TicketCategory = 'bug' | 'question' | 'suggestion'

interface Ticket {
  id: string
  subject: string
  category: TicketCategory
  status: TicketStatus
  created_at: string
  admin_reply: string | null
  replied_at: string | null
}

const CATEGORY_LABELS: Record<TicketCategory, string> = { bug: 'Bug', question: 'Question', suggestion: 'Suggestion' }
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

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<TicketCategory>('question')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function loadTickets() {
    setLoading(true)
    try {
      const res = await fetch('/api/support')
      const data = await res.json() as { tickets?: Ticket[] }
      setTickets(data.tickets ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTickets() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, category }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit')
      setSuccess(true)
      setSubject('')
      setMessage('')
      setCategory('question')
      setShowForm(false)
      await loadTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-content" style={{ maxWidth: 760 }}>
      <PageHeader title="Support" subtitle="Submit a ticket and we will get back to you as soon as possible." />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => { setShowForm(v => !v); setError(null); setSuccess(false) }}
          style={{
            padding: '8px 18px', borderRadius: 8,
            background: showForm ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, rgba(124,58,237,0.7), rgba(192,38,211,0.7))',
            border: showForm ? '1px solid rgba(255,255,255,0.1)' : 'none',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancel' : '+ New Ticket'}
        </button>
      </div>

      {success && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ADE80', fontSize: 13, marginBottom: 20 }}>
          Ticket submitted! We will review it shortly.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 14, padding: 20, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 15, margin: 0 }}>New Support Ticket</h3>

          <div style={{ display: 'flex', gap: 8 }}>
            {(['bug', 'question', 'suggestion'] as TicketCategory[]).map(cat => (
              <button key={cat} type="button" onClick={() => setCategory(cat)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: `1px solid ${category === cat ? CATEGORY_COLORS[cat].color + '60' : 'rgba(255,255,255,0.08)'}`, background: category === cat ? CATEGORY_COLORS[cat].bg : 'rgba(255,255,255,0.02)', color: category === cat ? CATEGORY_COLORS[cat].color : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Short description of your issue" maxLength={120} required
              style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#E9D5FF', fontSize: 13, outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." rows={5} maxLength={2000} required
              style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#E9D5FF', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {error && <p style={{ color: '#F87171', fontSize: 12, margin: 0 }}>{error}</p>}

          <button type="submit" disabled={submitting}
            style={{ padding: 10, borderRadius: 8, background: submitting ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, rgba(124,58,237,0.8), rgba(192,38,211,0.8))', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(168,85,247,0.15)', borderRadius: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>No tickets yet. Submit one if you need help!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tickets.map(ticket => {
            const sc = STATUS_COLORS[ticket.status]
            const cc = CATEGORY_COLORS[ticket.category]
            const isExpanded = expandedId === ticket.id
            const hasReply = !!ticket.admin_reply
            return (
              <div key={ticket.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${hasReply && !isExpanded ? 'rgba(34,197,94,0.25)' : 'rgba(168,85,247,0.12)'}`, borderRadius: 12, overflow: 'hidden' }}>
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                  <span style={{ flex: 1, color: '#E9D5FF', fontSize: 13, fontWeight: 600 }}>{ticket.subject}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cc.bg, color: cc.color, flexShrink: 0 }}>{CATEGORY_LABELS[ticket.category]}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.label}</span>
                  {hasReply && <span style={{ fontSize: 10, color: '#4ADE80', flexShrink: 0 }}>✓ Reply</span>}
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>
                      {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {ticket.admin_reply && (
                      <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }}>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Support reply</p>
                        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.admin_reply}</p>
                        {ticket.replied_at && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '6px 0 0' }}>{new Date(ticket.replied_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                      </div>
                    )}
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
