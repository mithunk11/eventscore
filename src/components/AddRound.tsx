'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sheet } from '@/components/Sheet'

export function AddRound({ eventId, nextPosition }: { eventId: string; nextPosition: number }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isFinal, setIsFinal] = useState(false)
  const [advance, setAdvance] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!isFinal && !advance) { setError('Enter how many go through, or mark this as the final.'); return }
    setSaving(true); setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('rounds').insert({
      event_id: eventId, position: nextPosition, name,
      advance_count: isFinal ? null : Number(advance),
    })

    if (error) { setError(error.message); setSaving(false); return }
    setName(''); setAdvance(''); setIsFinal(false); setOpen(false); setSaving(false)
    router.refresh()
  }

  return (
    <>
      <button className="btn btn-amber btn-full" onClick={() => setOpen(true)}>Add round</button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <p className="eyebrow nums">Round {String(nextPosition).padStart(2, '0')}</p>
          <h2 className="display d-l" style={{ marginBottom: 22 }}>New round</h2>
          <form onSubmit={save}>
            <div className="field">
              <label className="label" htmlFor="rname">Name</label>
              <input id="rname" className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Evening wear" />
            </div>
            <div className="field">
              <span className="label">What happens after</span>
              <div className="choice">
                <button type="button" aria-pressed={!isFinal} onClick={() => setIsFinal(false)}>Contestants advance</button>
                <button type="button" aria-pressed={isFinal} onClick={() => setIsFinal(true)}>This ends the event</button>
              </div>
            </div>
            {!isFinal && (
              <div className="field">
                <label className="label" htmlFor="radv">How many go through</label>
                <input id="radv" className="input nums" type="number" inputMode="numeric" min="1" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="8" />
              </div>
            )}
            {error && <p className="alert">{error}</p>}
            <button className="btn btn-amber btn-full" type="submit" disabled={saving} style={{ marginTop: 6 }}>
              {saving ? 'Saving' : 'Save round'}
            </button>
            <button className="btn btn-quiet btn-full" type="button" onClick={() => setOpen(false)} style={{ marginTop: 6 }}>Cancel</button>
          </form>
        </Sheet>
      )}
    </>
  )
}
