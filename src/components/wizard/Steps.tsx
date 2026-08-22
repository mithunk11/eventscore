'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveBasics, addRound, addCategory, saveSettings } from '@/app/events/wizard-actions'
import { AddedList } from '@/components/wizard/AddedList'
import { Spinner } from '@/components/Loading'

/* ---------- Step 1: the event itself ---------- */

export function StepBasics({ eventId, event }: {
  eventId: string
  event: { name: string; event_date: string | null; venue: string | null; winners_count: number }
}) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, start] = useTransition()
  const router = useRouter()

  function save(form: FormData) {
    setError(null)
    start(async () => {
      const res = await saveBasics(eventId, form)
      if (res?.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    })
  }

  return (
    <form action={save}>
      <div className="field">
        <label className="label" htmlFor="wn">Event name</label>
        <input id="wn" name="name" className="input" defaultValue={event.name} required />
      </div>
      <div className="field">
        <label className="label" htmlFor="wd">Date</label>
        <input id="wd" name="event_date" className="input" type="date"
          defaultValue={event.event_date ?? ''} />
      </div>
      <div className="field">
        <label className="label" htmlFor="wv">Venue</label>
        <input id="wv" name="venue" className="input" defaultValue={event.venue ?? ''}
          placeholder="Optional" />
      </div>
      <div className="field">
        <label className="label" htmlFor="ww">Winners at the end</label>
        <input id="ww" name="winners_count" className="input nums" type="number"
          inputMode="numeric" min="1" max="10" defaultValue={event.winners_count ?? 3} />
        <p className="sub" style={{ fontSize: 12 }}>
          Usually 3. The podium shows the top three; any beyond that appear in the
          ranked list.
        </p>
      </div>

      {error && <p className="alert">{error}</p>}
      {saved && <p className="ok-note">Saved.</p>}

      <button className="btn btn-ghost btn-full" type="submit" disabled={busy}>
        {busy ? <Spinner label="Saving" /> : 'Save'}
      </button>
    </form>
  )
}

/* ---------- Step 2: rounds ---------- */

export function StepRounds({ eventId, rounds }: {
  eventId: string
  rounds: { id: string; name: string; position: number; advance_count: number | null }[]
}) {
  const [isFinal, setIsFinal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const router = useRouter()

  function add(form: FormData) {
    setError(null)
    start(async () => {
      const res = await addRound(eventId, form)
      if (res?.error) { setError(res.error); return }
      const el = document.getElementById('rn') as HTMLInputElement | null
      const ad = document.getElementById('ra') as HTMLInputElement | null
      if (el) el.value = ''
      if (ad) ad.value = ''
      setIsFinal(false)
      router.refresh()
    })
  }

  return (
    <>
      <AddedList eventId={eventId} table="rounds"
        items={rounds.map((r) => ({
          id: r.id,
          primary: 'Round ' + r.position + ' — ' + r.name,
          secondary: r.advance_count ? 'Top ' + r.advance_count + ' go through' : 'Ends the event',
        }))}
        empty="No rounds yet. Add the first one below." />

      <form action={add} className="wiz-form">
        <input type="hidden" name="is_final" value={isFinal ? 'yes' : 'no'} />

        <div className="field">
          <label className="label" htmlFor="rn">Round name</label>
          <input id="rn" name="name" className="input" placeholder="Evening wear" required />
        </div>

        <div className="field">
          <span className="label">What happens after</span>
          <div className="choice">
            <button type="button" aria-pressed={!isFinal} onClick={() => setIsFinal(false)}>
              Contestants advance
            </button>
            <button type="button" aria-pressed={isFinal} onClick={() => setIsFinal(true)}>
              This ends the event
            </button>
          </div>
        </div>

        {!isFinal && (
          <div className="field">
            <label className="label" htmlFor="ra">How many go through</label>
            <input id="ra" name="advance" className="input nums" type="number"
              inputMode="numeric" min="1" placeholder="7" />
          </div>
        )}

        {error && <p className="alert">{error}</p>}

        <button className="btn btn-ghost btn-full" type="submit" disabled={busy}>
          {busy ? <Spinner label="Adding" /> : 'Add round'}
        </button>
      </form>
    </>
  )
}

/* ---------- Step 3: categories, one round at a time ---------- */

export function StepCategories({ eventId, rounds }: {
  eventId: string
  rounds: {
    id: string; name: string; position: number
    categories: { id: string; name: string; max_score: number }[]
  }[]
}) {
  const [which, setWhich] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const router = useRouter()

  if (rounds.length === 0) {
    return <p className="wiz-empty">Add a round first, then come back to say what gets marked.</p>
  }

  const round = rounds[Math.min(which, rounds.length - 1)]
  const total = round.categories.reduce((a, c) => a + Number(c.max_score), 0)

  function add(form: FormData) {
    setError(null)
    start(async () => {
      const res = await addCategory(eventId, round.id, form)
      if (res?.error) { setError(res.error); return }
      const el = document.getElementById('cn') as HTMLInputElement | null
      if (el) el.value = ''
      router.refresh()
    })
  }

  return (
    <>
      {rounds.length > 1 && (
        <div className="wiz-tabs">
          {rounds.map((r, i) => (
            <button key={r.id}
              className={'wiz-tab' + (i === which ? ' wiz-tab-on' : '')}
              onClick={() => setWhich(i)}>
              R{r.position}
              {r.categories.length === 0 && <span className="wiz-warn-dot" />}
            </button>
          ))}
        </div>
      )}

      <p className="wiz-context">
        What judges mark in <strong>{round.name}</strong>
      </p>

      <AddedList eventId={eventId} table="categories"
        items={round.categories.map((c) => ({
          id: c.id,
          primary: c.name,
          secondary: 'Out of ' + c.max_score,
        }))}
        empty="Nothing yet. A round cannot be scored without at least one." />

      {total > 0 && (
        <p className="wiz-total nums">Maximum from one judge: <strong>{total}</strong></p>
      )}

      <form action={add} className="wiz-form">
        <div className="field">
          <label className="label" htmlFor="cn">Category name</label>
          <input id="cn" name="name" className="input" placeholder="Poise" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="cm">Highest mark a judge can give</label>
          <input id="cm" name="max_score" className="input nums" type="number"
            inputMode="numeric" min="1" max="100" defaultValue="10" required />
        </div>

        {error && <p className="alert">{error}</p>}

        <button className="btn btn-ghost btn-full" type="submit" disabled={busy}>
          {busy ? <Spinner label="Adding" /> : 'Add to ' + round.name}
        </button>
      </form>
    </>
  )
}

/* ---------- Step 6: options ---------- */

export function StepSettings({ eventId, event }: {
  eventId: string
  event: { comments_mode: string; show_scores: boolean; retention_days: number }
}) {
  const [comments, setComments] = useState(event.comments_mode ?? 'optional')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, start] = useTransition()
  const router = useRouter()

  function save(form: FormData) {
    setError(null)
    start(async () => {
      const res = await saveSettings(eventId, form)
      if (res?.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    })
  }

  return (
    <form action={save}>
      <input type="hidden" name="comments_mode" value={comments} />

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
            Required for everyone
          </button>
        </div>
      </div>

      <label className="tick">
        <input type="checkbox" name="show_scores" defaultChecked={event.show_scores ?? true} />
        <span>Show marks beside names on the results and the podium</span>
      </label>

      <div className="field">
        <label className="label" htmlFor="wr">Delete this event automatically after</label>
        <input id="wr" name="retention_days" className="input nums" type="number"
          inputMode="numeric" min="1" max="3650" defaultValue={event.retention_days ?? 90} />
        <p className="sub" style={{ fontSize: 12 }}>
          Days after the event date. Photographs and marks are removed permanently.
        </p>
      </div>

      {error && <p className="alert">{error}</p>}
      {saved && <p className="ok-note">Saved.</p>}

      <button className="btn btn-ghost btn-full" type="submit" disabled={busy}>
        {busy ? <Spinner label="Saving" /> : 'Save options'}
      </button>
    </form>
  )
}
