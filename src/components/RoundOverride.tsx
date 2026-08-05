'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { forceCloseRound, reopenRound } from '@/app/events/actions'

export function RoundOverride({
  eventId, roundId, forceClosed, missing,
}: {
  eventId: string; roundId: string; forceClosed: boolean; missing: string[]
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, start] = useTransition()
  const router = useRouter()

  if (forceClosed) {
    return (
      <div className="override">
        <p className="sub" style={{ margin: 0 }}>
          This round was closed early. {missing.length > 0 ? missing.join(' and ') + ' did not submit.' : ''}
        </p>
        <button className="btn btn-quiet" disabled={busy}
          onClick={() => start(async () => { await reopenRound(eventId, roundId); router.refresh() })}>
          Reopen
        </button>
      </div>
    )
  }

  if (missing.length === 0) return null

  return (
    <div className="override">
      {!confirming ? (
        <>
          <p className="sub" style={{ margin: 0 }}>
            Waiting on {missing.join(' and ')}. Nobody can move on until they submit.
          </p>
          <button className="btn btn-ghost" style={{ minHeight: 40, fontSize: 13 }}
            onClick={() => setConfirming(true)}>Close without them</button>
        </>
      ) : (
        <>
          <p className="sub" style={{ margin: 0 }}>
            Close this round with {missing.length} judge{missing.length === 1 ? '' : 's'} missing?
            Their marks will not count towards the result.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-amber" style={{ minHeight: 40, fontSize: 13 }} disabled={busy}
              onClick={() => start(async () => { await forceCloseRound(eventId, roundId); router.refresh() })}>
              {busy ? 'Closing' : 'Yes, close it'}
            </button>
            <button className="btn btn-quiet" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
