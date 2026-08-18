'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sheet } from '@/components/Sheet'
import { Spinner } from '@/components/Loading'

export function AddRound({ eventId, nextPosition }: { eventId: string; nextPosition: number }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isFinal, setIsFinal] = useState(false)
  const [advance, setAdvance] = useState('')
  const [categoryRows, setCategoryRows] = useState([{ name: '', max: '10' }])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!isFinal && !advance) { setError('Enter how many go through, or mark this as the final.'); return }

    const named = categoryRows.filter((c) => c.name.trim())
    if (named.length === 0) {
      setError('Add at least one thing judges will mark in this round.')
      return
    }
    setSaving(true); setError(null)

    const supabase = createClient()
    const { data: round, error } = await supabase.from('rounds').insert({
      event_id: eventId, position: nextPosition, name,
      advance_count: isFinal ? null : Number(advance),
    }).select('id').single()

    if (error || !round) { setError(error?.message ?? 'Could not save.'); setSaving(false); return }

    const { error: catError } = await supabase.from('categories').insert(
      named.map((c, i) => ({
        round_id: round.id, position: i + 1,
        name: c.name.trim(), max_score: Number(c.max) || 10, weight: 1,
      }))
    )
    if (catError) { setError(catError.message); setSaving(false); return }

    setName(''); setAdvance(''); setIsFinal(false)
    setCategoryRows([{ name: '', max: '10' }])
    setOpen(false); setSaving(false)
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
            <div className="field">
              <span className="label">What judges mark in this round</span>
              {categoryRows.map((row, i) => (
                <div className="catrow" key={i}>
                  <input className="input" placeholder={i === 0 ? 'Presentation' : 'Another category'}
                    value={row.name}
                    onChange={(e) => {
                      const next = [...categoryRows]
                      next[i] = { ...next[i], name: e.target.value }
                      setCategoryRows(next)
                    }} />
                  <input className="input nums catmax" type="number" inputMode="numeric" min="1"
                    value={row.max} aria-label="Highest mark"
                    onChange={(e) => {
                      const next = [...categoryRows]
                      next[i] = { ...next[i], max: e.target.value }
                      setCategoryRows(next)
                    }} />
                  {categoryRows.length > 1 && (
                    <button type="button" className="catdrop"
                      onClick={() => setCategoryRows(categoryRows.filter((_, j) => j !== i))}
                      aria-label="Remove">&times;</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-full"
                style={{ minHeight: 42, fontSize: 14, marginTop: 4 }}
                onClick={() => setCategoryRows([...categoryRows, { name: '', max: '10' }])}>
                Add another category
              </button>
              <p className="sub" style={{ fontSize: 12 }}>
                The number beside each is the highest mark a judge can give for it.
                You can change all of this later.
              </p>
            </div>

            {error && <p className="alert">{error}</p>}
            <button className="btn btn-amber btn-full" type="submit" disabled={saving} style={{ marginTop: 6 }}>
              {saving ? <Spinner label="Saving" /> : 'Save round'}
            </button>
            <button className="btn btn-quiet btn-full" type="button" onClick={() => setOpen(false)} style={{ marginTop: 6 }}>Cancel</button>
          </form>
        </Sheet>
      )}
    </>
  )
}
