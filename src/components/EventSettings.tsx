'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEventSettings, deleteEvent } from '@/app/events/actions'

type EventRow = {
  id: string
  name: string
  comments_mode: string
  progression: string
  show_scores: boolean
  winners_count: number
  retention_days: number
}

export function EventSettings({ event }: { event: EventRow }) {
  const [comments, setComments] = useState(event.comments_mode ?? 'optional')
  const [progression, setProgression] = useState(event.progression ?? 'synchronised')
  const [saved, setSaved] = useState(false)
  const [danger, setDanger] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const router = useRouter()

  function save(form: FormData) {
    setError(null)
    start(async () => {
      const res = await updateEventSettings(event.id, form)
      if (res?.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    })
  }

  function remove() {
    setError(null)
    start(async () => {
      const res = await deleteEvent(event.id, typed)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <>
      <form action={save}>
        <input type="hidden" name="comments_mode" value={comments} />
        <input type="hidden" name="progression" value={progression} />

        <div className="field">
          <span className="label">Judge comments</span>
          <div className="choice">
            <button type="button" aria-pressed={comments === 'off'} onClick={() => setComments('off')}>
              Not asked for
            </button>
            <button type="button" aria-pressed={comments === 'optional'} onClick={() => setComments('optional')}>
              Optional
            </button>
            <button type="button" aria-pressed={comments === 'required'} onClick={() => setComments('required')}>
              Required for every contestant
            </button>
          </div>
        </div>

        <div className="field">
          <span className="label">Moving between rounds</span>
          <div className="choice">
            <button type="button" aria-pressed={progression === 'synchronised'} onClick={() => setProgression('synchronised')}>
              Everyone waits for the full panel
            </button>
            <button type="button" aria-pressed={progression === 'independent'} onClick={() => setProgression('independent')}>
              Judges move on independently
            </button>
          </div>
          <p className="sub" style={{ fontSize: 12 }}>
            {progression === 'synchronised'
              ? 'Safer, and the shortlist is always built from every judge. One slow judge holds up the room.'
              : 'Faster, but the shortlist freezes as soon as the first judge starts the next round.'}
          </p>
        </div>

        <div className="field">
          <label className="label" htmlFor="winners">How many winners on the podium</label>
          <input id="winners" name="winners_count" className="input nums" type="number" min="1" max="10"
            defaultValue={event.winners_count ?? 3} />
        </div>

        <label className="tick">
          <input type="checkbox" name="show_scores" defaultChecked={event.show_scores ?? true} />
          <span>Show marks beside names on the podium and results</span>
        </label>

        <div className="field">
          <label className="label" htmlFor="retention">Delete this event automatically after</label>
          <input id="retention" name="retention_days" className="input nums" type="number" min="1" max="3650"
            defaultValue={event.retention_days ?? 90} />
          <p className="sub" style={{ fontSize: 12 }}>
            Days after the event date. Contestant photos and all marks are removed
            permanently. Data you no longer hold cannot be leaked.
          </p>
        </div>

        {error && !danger && <p className="alert">{error}</p>}

        <button className="btn btn-amber btn-full" type="submit" disabled={busy} style={{ marginTop: 8 }}>
          {busy ? 'Saving' : saved ? 'Saved' : 'Save settings'}
        </button>
      </form>

      <div className="danger">
        <p className="eyebrow" style={{ color: 'var(--magenta)' }}>Permanent</p>
        <h2 className="display d-m" style={{ marginBottom: 6 }}>Delete this event</h2>
        <p className="sub" style={{ marginTop: 0 }}>
          Removes every contestant, judge, mark, comment and photograph. There is no
          undo and no backup.
        </p>

        {!danger ? (
          <button className="btn btn-ghost btn-full" style={{ marginTop: 14 }} onClick={() => setDanger(true)}>
            Delete event
          </button>
        ) : (
          <>
            <div className="field" style={{ marginTop: 14 }}>
              <label className="label" htmlFor="confirm">
                Type <strong style={{ color: 'var(--chalk)' }}>{event.name}</strong> to confirm
              </label>
              <input id="confirm" className="input" value={typed}
                onChange={(e) => setTyped(e.target.value)} placeholder={event.name} />
            </div>
            {error && <p className="alert">{error}</p>}
            <button className="btn btn-danger btn-full" disabled={busy || typed.trim() !== event.name.trim()}
              onClick={remove}>
              {busy ? 'Deleting' : 'Delete permanently'}
            </button>
            <button className="btn btn-quiet btn-full" onClick={() => { setDanger(false); setTyped(''); setError(null) }}
              style={{ marginTop: 6 }}>
              Cancel
            </button>
          </>
        )}
      </div>
    </>
  )
}
