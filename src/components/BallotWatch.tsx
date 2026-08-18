'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { skipBallot } from '@/app/events/actions'

export function BallotWatch({
  eventId, ballotId, place, names, waitingOn,
}: {
  eventId: string; ballotId: string; place: number
  names: string[]; waitingOn: string[]
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, start] = useTransition()
  const router = useRouter()

  return (
    <div className="override">
      <div>
        <p className="eyebrow" style={{ margin: '0 0 6px' }}>Tie for place {place}</p>
        <p className="sub" style={{ margin: 0 }}>
          {names.join(' and ')} are level. The judges are voting on it.
          {waitingOn.length > 0 && ' Waiting on ' + waitingOn.join(' and ') + '.'}
        </p>
      </div>

      {!confirming ? (
        <button className="btn btn-ghost" style={{ minHeight: 40, fontSize: 13 }}
          onClick={() => setConfirming(true)}>
          A judge cannot vote
        </button>
      ) : (
        <>
          <p className="sub" style={{ margin: 0 }}>
            Settle it by entry number instead? Use this only if a judge has left or
            their phone has died. It will be printed on the results.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-amber" style={{ minHeight: 40, fontSize: 13 }} disabled={busy}
              onClick={() => start(async () => { await skipBallot(eventId, ballotId); router.refresh() })}>
              {busy ? 'Settling' : 'Yes, settle it'}
            </button>
            <button className="btn btn-quiet" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
