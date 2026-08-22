'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCategory } from '@/app/events/actions'
import { Sheet } from '@/components/Sheet'
import { Spinner } from '@/components/Loading'

export function EditCategory({
  eventId, roundId, categoryId, name, maxScore,
}: {
  eventId: string; roundId: string; categoryId: string
  name: string; maxScore: number
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const router = useRouter()

  function save(form: FormData) {
    setError(null)
    start(async () => {
      const res = await updateCategory(eventId, roundId, categoryId, form)
      if (res?.error) { setError(res.error); return }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button className="trash" onClick={() => setOpen(true)}>Edit</button>

      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <p className="eyebrow">Category</p>
          <h2 className="display d-l" style={{ marginBottom: 20 }}>Edit {name}</h2>

          <form action={save}>
            <div className="field">
              <label className="label" htmlFor={'cn' + categoryId}>Name</label>
              <input id={'cn' + categoryId} name="name" className="input"
                defaultValue={name} required />
            </div>
            <div className="field">
              <label className="label" htmlFor={'cm' + categoryId}>
                Highest mark a judge can give
              </label>
              <input id={'cm' + categoryId} name="max_score" className="input nums"
                type="number" inputMode="numeric" min="1" max="100"
                defaultValue={maxScore} required />
            </div>

            {error && <p className="alert">{error}</p>}

            <button className="btn btn-amber btn-full" type="submit" disabled={busy}>
              {busy ? <Spinner label="Saving" /> : 'Save category'}
            </button>
            <button className="btn btn-quiet btn-full" type="button"
              onClick={() => setOpen(false)} style={{ marginTop: 6 }}>
              Cancel
            </button>
          </form>
        </Sheet>
      )}
    </>
  )
}
