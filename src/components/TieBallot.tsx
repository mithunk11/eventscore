'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { castTieVote } from '@/app/judge/actions'
import { Spinner } from '@/components/Loading'

type Contender = { entryId: string; name: string; bib: string | null; photo: string | null }

const PLACE_WORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth']

export function TieBallot({
  ballotId, place, contenders, alreadyVoted, waitingOn,
}: {
  ballotId: string
  place: number
  contenders: Contender[]
  alreadyVoted: string | null
  waitingOn: string[]
}) {
  const [picked, setPicked] = useState<string | null>(alreadyVoted)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const sending = useRef(false)
  const router = useRouter()

  function send() {
    if (!picked || sending.current) return
    sending.current = true
    setError(null)
    start(async () => {
      try {
        const res = await castTieVote(ballotId, picked)
        if (res?.error) { setError(res.error); return }
        router.refresh()
      } finally {
        sending.current = false
      }
    })
  }

  if (alreadyVoted) {
    const mine = contenders.find((c) => c.entryId === alreadyVoted)
    return (
      <div className="screen">
        <p className="eyebrow">Tie for {PLACE_WORD[place] ?? place + 'th'} place</p>
        <h1 className="display d-xl">Vote cast</h1>
        <p className="sub" style={{ marginBottom: 26 }}>
          You chose <strong>{mine?.name}</strong>.
          {waitingOn.length > 0
            ? ' Waiting for ' + waitingOn.join(' and ') + '.'
            : ' Working out the result.'}
        </p>
        {waitingOn.length > 0 && (
          <div className="waiting">
            {waitingOn.map((n) => <span key={n} className="who">{n}</span>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="screen">
        <p className="eyebrow">Tie for {PLACE_WORD[place] ?? place + 'th'} place</p>
        <h1 className="display d-xl">Your call</h1>
        <p className="sub" style={{ marginBottom: 26 }}>
          {contenders.length === 2 ? 'These two are' : 'These are'} exactly level on marks.
          Which should place higher? Scores are hidden so the choice is about the
          performance.
        </p>

        <div className="contenders">
          {contenders.map((c) => (
            <button
              key={c.entryId}
              type="button"
              className={'contender' + (picked === c.entryId ? ' contender-on' : '')}
              onClick={() => { setPicked(c.entryId); setConfirming(false) }}
              aria-pressed={picked === c.entryId}
            >
              {c.photo
                ? <img className="contender-photo" src={c.photo} alt="" />
                : <span className="contender-photo contender-blank">{c.name.slice(0, 1).toUpperCase()}</span>}
              {c.bib && <span className="contender-bib nums">Chest {c.bib}</span>}
              <span className="contender-name">{c.name}</span>
              {picked === c.entryId && <span className="contender-tick">&#10003;</span>}
            </button>
          ))}
        </div>

        {error && <p className="alert" style={{ marginTop: 18 }}>{error}</p>}
      </div>

      <div className="dock dock-review">
        {!confirming ? (
          <button className="btn btn-amber btn-full" disabled={!picked}
            onClick={() => setConfirming(true)}>
            {picked ? 'Continue' : 'Choose one'}
          </button>
        ) : (
          <>
            <p className="warnline" style={{ marginBottom: 4 }}>
              Your vote is private and cannot be changed once cast.
            </p>
            <button className="btn btn-amber btn-full" disabled={busy} onClick={send}>
              {busy ? <Spinner label="Sending" /> : 'Cast my vote'}
            </button>
            <button className="btn btn-quiet btn-full" onClick={() => setConfirming(false)}>
              Back
            </button>
          </>
        )}
      </div>
    </>
  )
}
