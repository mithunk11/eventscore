'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateRound, deleteRound } from '@/app/events/actions'
import { Sheet } from '@/components/Sheet'
import { Spinner } from '@/components/Loading'

export function EditRound({
  eventId, roundId, name, advanceCount, locked, roundCount,
}: {
  eventId: string
  roundId: string
  name: string
  advanceCount: number | null
  locked: boolean
  roundCount: number
}) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState(name)
  const [isFinal, setIsFinal] = useState(advanceCount == null)
  const [advance, setAdvance] = useState(advanceCount ? String(advanceCount) : '')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const router = useRouter()

  function save(form: FormData) {
    setError(null)
    start(async () => {
      const res = await updateRound(eventId, roundId, form)
      if (res?.error) { setError(res.error); return }
      setOpen(false)
      router.refresh()
    })
  }

  function remove() {
    setError(null)
    start(async () => {
      const res = await deleteRound(eventId, roundId)
      if (res?.error) setError(res.error)
    })
  }

  if (locked) {
    return (
      <p className="lockednote">
        Judges have started scoring this round, so its name, marks and categories
        are fixed. This protects marks already given.
      </p>
    )
  }

  return (
    <>
      <button className="btn btn-ghost btn-full" onClick={() => setOpen(true)}>
        Edit this round
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <p className="eyebrow">Round settings</p>
          <h2 className="display d-l" style={{ marginBottom: 20 }}>Edit round</h2>

          <form action={save}>
            <input type="hidden" name="is_final" value={isFinal ? 'yes' : 'no'} />

            <div className="field">
              <label className="label" htmlFor="rn">Name</label>
              <input id="rn" name="name" className="input" value={newName}
                onChange={(e) => setNewName(e.target.value)} required />
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
                  inputMode="numeric" min="1" value={advance}
                  onChange={(e) => setAdvance(e.target.value)} />
              </div>
            )}

            {error && <p className="alert">{error}</p>}

            <button className="btn btn-amber btn-full" type="submit" disabled={busy}>
              {busy ? <Spinner label="Saving" /> : 'Save changes'}
            </button>
          </form>

          {roundCount > 1 && (
            <div className="danger" style={{ marginTop: 26 }}>
              <p className="eyebrow" style={{ color: 'var(--rose)' }}>Permanent</p>
              <h3 className="display d-m" style={{ marginBottom: 6 }}>Delete this round</h3>
              <p className="sub" style={{ marginTop: 0 }}>
                Removes the round and its categories. Later rounds move up to close
                the gap.
              </p>

              {!confirming ? (
                <button className="btn btn-ghost btn-full" style={{ marginTop: 12 }}
                  onClick={() => setConfirming(true)}>
                  Delete round
                </button>
              ) : (
                <>
                  <button className="btn btn-danger btn-full" style={{ marginTop: 12 }}
                    disabled={busy} onClick={remove}>
                    {busy ? <Spinner label="Deleting" /> : 'Yes, delete it'}
                  </button>
                  <button className="btn btn-quiet btn-full" style={{ marginTop: 6 }}
                    onClick={() => setConfirming(false)}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          <button className="btn btn-quiet btn-full" onClick={() => setOpen(false)}
            style={{ marginTop: 10 }}>
            Close
          </button>
        </Sheet>
      )}
    </>
  )
}
