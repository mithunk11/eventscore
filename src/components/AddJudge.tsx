'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resizeImage } from '@/lib/resize'
import { Sheet } from '@/components/Sheet'
import { Spinner } from '@/components/Loading'
import { PhotoPicker } from '@/components/PhotoPicker'

function makePin() {
  const n = new Uint32Array(1)
  crypto.getRandomValues(n)
  return String(1000 + (n[0] % 9000))
}

export function AddJudge({ eventId, nextPosition }: { eventId: string; nextPosition: number }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
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
        const path = user.id + '/' + eventId + '/j-' + crypto.randomUUID() + '.jpg'
        const { error: upErr } = await supabase.storage.from('event-media').upload(path, blob, { contentType: 'image/jpeg' })
        if (upErr) { setError(upErr.message); setSaving(false); return }
        photoPath = path
      } catch {
        setError('That image could not be processed. Try a different one.')
        setSaving(false); return
      }
    }

    const pin = makePin()
    const { error } = await supabase.from('judges').insert({
      event_id: eventId, name, photo_url: photoPath, pin, pin_hash: pin, position: nextPosition,
    })

    if (error) { setError(error.message); setSaving(false); return }

    setName(''); setFile(null); setOpen(false); setSaving(false)
    router.refresh()
  }

  return (
    <>
      <button className="btn btn-amber btn-full" onClick={() => setOpen(true)}>Add judge</button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <p className="eyebrow">New judge</p>
          <h2 className="display d-l" style={{ marginBottom: 6 }}>Who is on the panel</h2>
          <p className="sub" style={{ marginBottom: 22 }}>
            {nextPosition === 1
              ? 'The first judge added becomes head judge, and decides any tie the panel ballot cannot.'
              : 'A four-digit PIN is generated when you save.'}
          </p>
          <form onSubmit={save}>
            <PhotoPicker onPick={setFile} />
            <div className="field">
              <label className="label" htmlFor="jn">Name</label>
              <input id="jn" className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Marie Kelly" />
            </div>
            {error && <p className="alert">{error}</p>}
            <button className="btn btn-amber btn-full" type="submit" disabled={saving} style={{ marginTop: 6 }}>
              {saving ? <Spinner label="Saving" /> : 'Save judge'}
            </button>
            <button className="btn btn-quiet btn-full" type="button" onClick={() => setOpen(false)} style={{ marginTop: 6 }}>Cancel</button>
          </form>
        </Sheet>
      )}
    </>
  )
}
