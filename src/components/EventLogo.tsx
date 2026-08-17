'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resizeImage } from '@/lib/resize'
import { PhotoPicker } from '@/components/PhotoPicker'

export function EventLogo({ eventId, current }: { eventId: string; current: string | null }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, start] = useTransition()
  const router = useRouter()

  function save() {
    setError(null)
    start(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Your session expired.'); return }

      let path: string | null = null
      if (file) {
        try {
          const blob = await resizeImage(file, 600, 0.9)
          path = user.id + '/' + eventId + '/logo-' + crypto.randomUUID() + '.jpg'
          const { error: upErr } = await supabase.storage
            .from('event-media').upload(path, blob, { contentType: 'image/jpeg' })
          if (upErr) { setError(upErr.message); return }
        } catch {
          setError('That image could not be processed.')
          return
        }
      }

      const { error: dbErr } = await supabase.from('events')
        .update({ logo_url: path }).eq('id', eventId)
      if (dbErr) { setError(dbErr.message); return }

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    })
  }

  return (
    <>
      <p className="sub" style={{ marginTop: 0, marginBottom: 16 }}>
        Shown to you and to your judges while they mark, and on the results. A
        square or wide image works best.
      </p>
      <PhotoPicker onPick={setFile} initial={current ?? undefined} />
      {error && <p className="alert">{error}</p>}
      {saved && <p className="ok-note">Logo saved.</p>}
      <button className="btn btn-ghost btn-full" disabled={busy || !file} onClick={save}>
        {busy ? 'Saving' : 'Save logo'}
      </button>
    </>
  )
}
