'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMarkSync } from '@/components/useMarkSync'
import { SyncBadge } from '@/components/SyncBadge'
import { saveMarks, saveComment, submitRound } from '@/app/judge/actions'

type Category = { id: string; name: string; max_score: number }
type Person = { entryId: string; name: string; bib: string | null; description: string | null; photo: string | null }
type JudgeState = { name: string; submitted: boolean }

export function JudgeScorecard({
  roundId, roundName, roundPosition, isFinal, categories, people,
  initial, initialComments, commentsMode, submitted, panel, hasNextRound,
}: {
  roundId: string
  roundName: string
  roundPosition: number
  isFinal: boolean
  categories: Category[]
  people: Person[]
  initial: Record<string, Record<string, number | null>>
  initialComments: Record<string, string>
  commentsMode: 'off' | 'optional' | 'required'
  submitted: boolean
  panel: JudgeState[]
  hasNextRound: boolean
}) {
  // Only open on review if this round has actually been marked. Straight after
  // submitting a round, `submitted` can still be true while the next round loads.
  const anyMarks = Object.values(initial).some((cats) =>
    Object.values(cats ?? {}).some((v) => typeof v === 'number')
  )
  const [view, setView] = useState<'card' | 'review'>(submitted && anyMarks ? 'review' : 'card')
  const [index, setIndex] = useState(0)

  // A new round arriving resets the view and the position
  useEffect(() => {
    setIndex(0)
    setMarks(initial)
    setView(submitted && anyMarks ? 'review' : 'card')
    // Only roundId: `initial` is a fresh object each render and would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId])
  const [marks, setMarks] = useState(initial)
  const [notes, setNotes] = useState(initialComments)
  const [error, setError] = useState<string | null>(null)
  const sync = useMarkSync()
  const [busy, startTask] = useTransition()
  const submittingRef = useRef(false)
  const pendingRef = useRef<Map<string, { entryId: string; categoryId: string; value: number }>>(new Map())
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stage, setStage] = useState('')
  const router = useRouter()

  const soloJudge = panel.length <= 1
  const waitingOn = panel.filter((p) => !p.submitted).map((p) => p.name)
  const everyoneIn = waitingOn.length === 0

  // While waiting on other judges, quietly check for their submissions.
  // Poll for other judges while waiting.
  //
  // `router` must NOT be a dependency: Next.js hands back a new router object
  // on every render, and router.refresh() causes a render, so the effect kept
  // rebuilding its interval and requests compounded until the tab died.
  //
  // The interval is held in a ref and only ever started once per wait.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const routerRef = useRef(router)
  routerRef.current = router

  useEffect(() => {
    const shouldPoll = submitted && !everyoneIn

    if (!shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    if (pollRef.current) return   // already polling

    pollRef.current = setInterval(() => {
      // Do not poll a tab nobody is looking at
      if (typeof document !== 'undefined' && document.hidden) return
      routerRef.current.refresh()
    }, 10000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [submitted, everyoneIn])

  const person = people[index]
  const mine = marks[person.entryId] ?? {}

  // Postgres returns numeric columns as strings, so never test with typeof
  const has = (id: string, catId: string) => {
    const v = (marks[id] ?? {})[catId]
    return v !== null && v !== undefined && !Number.isNaN(Number(v))
  }
  const val = (id: string, catId: string) => {
    const v = (marks[id] ?? {})[catId]
    return v === null || v === undefined ? 0 : Number(v)
  }
  const complete = (id: string) => categories.every((c) => has(id, c.id))
  const partial = (id: string) => categories.some((c) => has(id, c.id))
  const totalFor = (id: string) => categories.reduce((s, c) => s + val(id, c.id), 0)

  const doneCount = people.filter((p) => complete(p.entryId)).length
  const allDone = doneCount === people.length
  const maxTotal = categories.reduce((s, c) => s + Number(c.max_score), 0)

  function change(categoryId: string, next: number, max: number) {
    if (submitted) return
    const clamped = Math.max(0, Math.min(max, Math.round(next * 2) / 2))

    // The screen updates at once. Reaching the server is the queue's problem.
    setMarks((prev) => ({
      ...prev,
      [person.entryId]: { ...(prev[person.entryId] ?? {}), [categoryId]: clamped },
    }))
    sync.record(person.entryId, categoryId, clamped)
  }

  function writeNote(body: string) {
    if (submitted) return
    setNotes((prev) => ({ ...prev, [person.entryId]: body }))
  }

  function commitNote() {
    if (submitted) return
    const body = notes[person.entryId] ?? ''
    startTask(async () => { await saveComment(person.entryId, body) })
  }

  async function submit() {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    setStage('Saving your marks')

    try {
      const stillWaiting = await sync.flushNow()
      if (stillWaiting > 0) {
        setError('Some marks have not reached the server yet. Check your connection and try again.')
        setSubmitting(false)
        submittingRef.current = false
        setStage('')
        return
      }

      const res = await submitRound(roundId)

      if (res?.error) {
        setError(res.error)
        setSubmitting(false)
        submittingRef.current = false
        setStage('')
        return
      }

      setStage('Working out who goes through')
      router.refresh()

      // The refresh re-renders this component from the server. If it has not
      // happened within a few seconds, stop pretending and let them retry.
      setTimeout(() => {
        submittingRef.current = false
        setSubmitting(false)
        setStage('')
      }, 4000)
    } catch {
      setError('That did not go through. Check your connection and try again.')
      setSubmitting(false)
      submittingRef.current = false
      setStage('')
    }
  }

  // ---------------- Review ----------------
  if (view === 'review') {
    return (
      <>
        <div className="screen">
          <p className="eyebrow nums">Round {String(roundPosition).padStart(2, '0')} &middot; {roundName}</p>
          <h1 className="display d-xl">{submitted ? 'Submitted' : 'Check your marks'}</h1>
          <p className="sub" style={{ marginBottom: 22 }}>
            {submitted
              ? soloJudge
                ? 'Submitted. You are the only judge, so this round is complete.'
                : everyoneIn
                  ? 'Every judge is in.'
                  : 'Waiting for ' + waitingOn.join(' and ') + '.'
              : 'Tap anyone to change a mark before you submit.'}
          </p>

          {submitted && !everyoneIn && !soloJudge && (
            <div className="waiting">
              {panel.map((p) => (
                <span key={p.name} className={p.submitted ? 'who who-in' : 'who'}>
                  {p.submitted ? '\u2713 ' : ''}{p.name}
                </span>
              ))}
            </div>
          )}

          <ul className="list" style={{ marginTop: 18 }}>
            {people.map((p, i) => (
              <li key={p.entryId}>
                <button className="card review-row" onClick={() => { if (!submitted) { setIndex(i); setView('card') } }}>
                  <span className="avatar-wrap">
                    {p.photo
                      ? <img className="avatar" src={p.photo} alt="" />
                      : <span className="thumb">{p.name.slice(0, 1).toUpperCase()}</span>}
                    {p.bib && <span className="bib nums">{p.bib}</span>}
                  </span>
                  <span className="card-body">
                    <span className="card-title">{p.name}</span>
                    <span className="card-meta nums">
                      {categories.map((c) => has(p.entryId, c.id) ? val(p.entryId, c.id) : '\u2014').join('  \u00B7  ')}
                    </span>
                  </span>
                  <span className="mark nums">{totalFor(p.entryId)}<small>/{maxTotal}</small></span>
                </button>
              </li>
            ))}
          </ul>

          {error && <p className="alert" style={{ marginTop: 18 }}>{error}</p>}
        </div>

        <div className={submitting ? 'dock dock-review working' : 'dock dock-review'}>
          {!submitted ? (
            <>
              <button className="btn btn-amber btn-full" onClick={submit} disabled={submitting}>
                {submitting ? (
                  <span className="btn-working">
                    <span className="spinner" aria-hidden="true" />
                    {stage || 'Submitting'}
                  </span>
                ) : 'Submit round'}
              </button>
              <button className="btn btn-quiet btn-full" onClick={() => setView('card')} style={{ marginTop: 6 }}>
                Back to scoring
              </button>
            </>
          ) : everyoneIn ? (
            <a className="btn btn-amber btn-full" href="/judge/shortlist">
              {isFinal ? 'See the rankings' : 'See who goes through'}
            </a>
          ) : (
            <button className="btn btn-ghost btn-full" disabled>
              Waiting for {waitingOn.length} judge{waitingOn.length === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </>
    )
  }

  // ---------------- Scorecard ----------------
  const total = totalFor(person.entryId)

  return (
    <>
      <div className="screen">
        {sync.state === 'offline' && (
          <div className="offline-banner">
            <strong>No connection.</strong> Keep marking. Everything is saved on this
            device and will be sent the moment the signal returns.
          </div>
        )}

        <p className="eyebrow nums">
          Round {String(roundPosition).padStart(2, '0')} &middot; {roundName}{isFinal ? ' \u00B7 Final' : ''}
        </p>

        <div className="chips">
          {people.map((p, i) => (
            <button key={p.entryId} type="button"
              className={'chip' + (i === index ? ' chip-now' : '')}
              onClick={() => setIndex(i)}>
              {p.bib ?? i + 1}
            </button>
          ))}
        </div>

        <div className="score-head">
          {person.photo
            ? <img className="score-photo" src={person.photo} alt="" />
            : <div className="score-photo score-photo-blank">{person.name.slice(0, 1).toUpperCase()}</div>}
          <div>
            {person.bib && <span className="eyebrow nums" style={{ marginBottom: 4, display: 'block' }}>Chest {person.bib}</span>}
            <h1 className="display d-l">{person.name}</h1>
            {person.description && <p className="sub" style={{ marginTop: 4 }}>{person.description}</p>}
          </div>
        </div>

        <div className="running">
          <span className="label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            Your total
            <SyncBadge state={sync.state} waiting={sync.waiting} />
          </span>
          <span className="running-value nums">{total}<small> / {maxTotal}</small></span>
        </div>

        {categories.map((c) => {
          const marked = has(person.entryId, c.id)
          const v = val(person.entryId, c.id)
          return (
            <div key={c.id} className="cat">
              <div className="cat-top">
                <span className="cat-name">{c.name}</span>
                <span className="cat-value nums">{marked ? v : '\u2014'}<small> / {c.max_score}</small></span>
              </div>
              <div className="stepper">
                <button type="button" className="step-btn"
                  onClick={() => change(c.id, v - 0.5, Number(c.max_score))}>&minus;</button>
                <input className="slider" type="range" min={0} max={Number(c.max_score)} step={0.5}
                  value={v}
                  onChange={(e) => change(c.id, Number(e.target.value), Number(c.max_score))}
                  aria-label={c.name} />
                <button type="button" className="step-btn"
                  onClick={() => change(c.id, v + 0.5, Number(c.max_score))}>+</button>
              </div>
            </div>
          )
        })}

        {commentsMode !== 'off' && (
          <div className="field" style={{ marginTop: 26 }}>
            <label className="label" htmlFor="note">
              Comment {commentsMode === 'required' ? '(needed)' : '(optional)'}
            </label>
            <textarea id="note" className="input" rows={3}
              value={notes[person.entryId] ?? ''}
              onChange={(e) => writeNote(e.target.value)}
              onBlur={commitNote}
              placeholder="Anything worth noting" />
          </div>
        )}

        {error && <p className="alert" style={{ marginTop: 18 }}>{error}</p>}
      </div>

      <div className={submitting ? "dock working" : "dock"}>
        <div className="nav-row">
          <button className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
          <span className="nav-count nums">
            {index === people.length - 1 ? 'Last of ' + people.length : (index + 1) + ' of ' + people.length}
          </span>
          {index === people.length - 1 ? (
            <button className="btn btn-amber nav-go" onClick={() => setView('review')}>Review</button>
          ) : (
            <button className="btn btn-amber nav-go" onClick={() => setIndex(index + 1)}>Next</button>
          )}
        </div>
      </div>
    </>
  )
}
