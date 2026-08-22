'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { castTieVote } from '@/app/judge/actions'
import { Spinner } from '@/components/Loading'

type Contender = { entryId: string; name: string; bib: string | null; photo: string | null }

const PLACE_WORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth']

export function TieBallot({
  ballotId, place, contenders, alreadyVoted, waitingOn, resolved, nextHref,
}: {
  ballotId: string
  place: number
  contenders: Contender[]
  alreadyVoted: string | null
  waitingOn: string[]
  resolved: boolean
  nextHref: string
}) {
  const [picked, setPicked] = useState<string | null>(alreadyVoted)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const sending = useRef(false)
  const router = useRouter()

  // Poll while waiting for the rest of the panel.
  //
  // router must NOT be a dependency: Next.js returns a new one each render and
  // refresh() causes a render, so the interval would rebuild endlessly.
  const routerRef = useRef(router)
  routerRef.current = router
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const waiting = Boolean(alreadyVoted) && !resolved

  useEffect(() => {
    if (!waiting) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    if (pollRef.current) return

    pollRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      routerRef.current.refresh()
    }, 5000)

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [waiting])

  // Once it resolves, move on rather than leaving them on a dead screen
  useEffect(() => {
    if (resolved) {
      const t = setTimeout(() => routerRef.current.push(nextHref), 1400)
      return () => clearTimeout(t)
    }
  }, [resolved, nextHref])

  function send() {
    if (!picked || sending.current) return
    sending.current = true
    setError(null)
    start(async () => {
      try {
        const res = await castTieVote(ballotId, picked)
        if (res?.error) { setError(res.error); return }
        routerRef.current.refresh()
      } finally {
        sending.current = false
      }
    })
  }

  const mine = contenders.find((c) => c.entryId === alreadyVoted)

  /* ---------- Settled ---------- */
  if (resolved) {
    return (
      <>
        <div className="screen">
          <p className="eyebrow">Tie for {PLACE_WORD[place] ?? place + 'th'} place</p>
          <h1 className="display d-xl">Settled</h1>
          <p className="sub">The panel has decided. Taking you to the rankings.</p>
          <div className="ballot-wait">
            <span className="spinner" aria-hidden="true" />
          </div>
        </div>
        <div className="dock">
          <a className="btn btn-amber btn-full" href={nextHref}>See the rankings</a>
        </div>
      </>
    )
  }

  /* ---------- Voted, waiting on others ---------- */
  if (alreadyVoted) {
    return (
      <>
        <div className="screen">
          <p className="eyebrow">Tie for {PLACE_WORD[place] ?? place + 'th'} place</p>
          <h1 className="display d-xl">Vote cast</h1>
          <p className="sub" style={{ marginBottom: 24 }}>
            You chose <strong>{mine?.name ?? 'your pick'}</strong>
            {mine?.bib ? ' (chest ' + mine.bib + ')' : ''}.
          </p>

          {waitingOn.length > 0 ? (
            <div className="ballot-panel">
              <p className="ballot-panel-title">
                Waiting for {waitingOn.length} judge{waitingOn.length === 1 ? '' : 's'}
              </p>
              <div className="waiting">
                {waitingOn.map((n) => <span key={n} className="who">{n}</span>)}
              </div>
              <p className="ballot-note">
                <span className="dot-pulse" aria-hidden="true" />
                This updates on its own. Nothing to tap.
              </p>
            </div>
          ) : (
            <div className="ballot-panel">
              <p className="ballot-panel-title">Everyone has voted</p>
              <p className="ballot-note">
                <span className="dot-pulse" aria-hidden="true" />
                Working out the result.
              </p>
            </div>
          )}
        </div>

        <div className="dock">
          <button className="btn btn-quiet btn-full" onClick={() => router.refresh()}>
            Check now
          </button>
        </div>
      </>
    )
  }

  /* ---------- Still to vote ---------- */
  return (
    <>
      <div className="screen">
        <p className="eyebrow">Tie for {PLACE_WORD[place] ?? place + 'th'} place</p>
        <h1 className="display d-xl">Your call</h1>
        <p className="sub" style={{ marginBottom: 26 }}>
          {contenders.length === 2 ? 'These two are' : 'These are'} exactly level on
          marks. Which should place higher? Scores are hidden so the choice is about
          the performance.
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
