'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/Loading'

export default function NewEventPage() {
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [venue, setVenue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Your session expired. Sign in again.'); setSaving(false); return }

    const { data, error } = await supabase.from('events')
      .insert({ owner_id: user.id, name, event_date: eventDate || null, venue: venue || null })
      .select('id').single()

    if (error) { setError(error.message); setSaving(false); return }
    router.push('/events/' + data.id); router.refresh()
  }

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href="/dashboard" aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">New event</span>
      </header>

      <div className="screen">
        <p className="eyebrow">Setting the bill</p>
        <h1 className="display d-xl">The basics</h1>
        <p className="sub" style={{ marginBottom: 30 }}>Rounds, contestants and judges come next.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="name">Event name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Miss Galway 2026" />
          </div>
          <div className="field">
            <label className="label" htmlFor="date">Date</label>
            <input id="date" className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="venue">Venue</label>
            <input id="venue" className="input" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Optional" />
          </div>
          {error && <p className="alert">{error}</p>}
          <button className="btn btn-amber btn-full" type="submit" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? <Spinner label="Creating" /> : 'Create event'}
          </button>
        </form>
      </div>
    </div>
  )
}
