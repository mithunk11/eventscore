'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resizeImage } from '@/lib/resize'
import { Sheet } from '@/components/Sheet'
import { Spinner } from '@/components/Loading'
import { PhotoPicker } from '@/components/PhotoPicker'

export function AddContestant({ eventId, nextBib }: { eventId: string; nextBib: number }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [bib, setBib] = useState(String(nextBib))
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Your session expired. Sign in again.'); setSaving(false); return }

    let photoPath: string | null = null
    if (file) {
      try {
        const blob = await resizeImage(file)
        const path = user.id + '/' + eventId + '/c-' + crypto.randomUUID() + '.jpg'
        const { error: upErr } = await supabase.storage.from('event-media').upload(path, blob, { contentType: 'image/jpeg' })
        if (upErr) { setError(upErr.message); setSaving(false); return }
        photoPath = path
      } catch {
        setError('That image could not be processed. Try a different one.')
        setSaving(false); return
      }
    }

    const { error } = await supabase.from('contestants').insert({
      event_id: eventId, name, bib_number: bib || null,
      description: description || null, photo_url: photoPath,
    })

    if (error) { setError(error.message); setSaving(false); return }

    setName(''); setBib(String(Number(bib) + 1)); setDescription(''); setFile(null)
    setOpen(false); setSaving(false)
    router.refresh()
  }

  return (
    <>
      <button className="btn btn-amber btn-full" onClick={() => setOpen(true)}>Add contestant</button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <p className="eyebrow">New contestant</p>
          <h2 className="display d-l" style={{ marginBottom: 22 }}>Who is competing</h2>
          <form onSubmit={save}>
            <PhotoPicker onPick={setFile} />
            <div className="field">
              <label className="label" htmlFor="cn">Name</label>
              <input id="cn" className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Aoife Byrne" />
            </div>
            <div className="field">
              <label className="label" htmlFor="cb">Entry number</label>
              <input id="cb" className="input nums" inputMode="numeric" value={bib} onChange={(e) => setBib(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="cd">Description</label>
              <input id="cd" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional, shown to judges" />
            </div>
            {error && <p className="alert">{error}</p>}
            <button className="btn btn-amber btn-full" type="submit" disabled={saving} style={{ marginTop: 6 }}>
              {saving ? <Spinner label="Saving" /> : 'Save contestant'}
            </button>
            <button className="btn btn-quiet btn-full" type="button" onClick={() => setOpen(false)} style={{ marginTop: 6 }}>Cancel</button>
          </form>
        </Sheet>
      )}
    </>
  )
}
