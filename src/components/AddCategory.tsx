'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sheet } from '@/components/Sheet'

export function AddCategory({ roundId, nextPosition }: { roundId: string; nextPosition: number }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [maxScore, setMaxScore] = useState('10')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('categories').insert({
      round_id: roundId, position: nextPosition, name, max_score: Number(maxScore), weight: 1,
    })

    if (error) { setError(error.message); setSaving(false); return }
    setName(''); setMaxScore('10'); setOpen(false); setSaving(false)
    router.refresh()
  }

  return (
    <>
      <button className="btn btn-amber btn-full" onClick={() => setOpen(true)}>Add category</button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <p className="eyebrow">New category</p>
          <h2 className="display d-l" style={{ marginBottom: 22 }}>What gets marked</h2>
          <form onSubmit={save}>
            <div className="field">
              <label className="label" htmlFor="cname">Category name</label>
              <input id="cname" className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Poise" />
            </div>
            <div className="field">
              <label className="label" htmlFor="cmax">Highest mark a judge can give</label>
              <input id="cmax" className="input nums" type="number" inputMode="numeric" min="1" max="100" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} required />
            </div>
            {error && <p className="alert">{error}</p>}
            <button className="btn btn-amber btn-full" type="submit" disabled={saving} style={{ marginTop: 6 }}>
              {saving ? 'Saving' : 'Save category'}
            </button>
            <button className="btn btn-quiet btn-full" type="button" onClick={() => setOpen(false)} style={{ marginTop: 6 }}>Cancel</button>
          </form>
        </Sheet>
      )}
    </>
  )
}
