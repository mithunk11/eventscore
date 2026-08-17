'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveMark, saveComment, submitRound } from '@/app/judge/actions'

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
  const [view, setView] = useState<'card' | 'review'>(submitted ? 'review' : 'card')
  const [index, setIndex] = useState(0)
  const [marks, setMarks] = useState(initial)
  const [notes, setNotes] = useState(initialComments)
  const [error, setError] = useState<string | null>(null)
  const [busy, startTask] = useTransition()
  const submittingRef = useRef(false)
  const router = useRouter()

  const soloJudge = panel.length <= 1
  const waitingOn = panel.filter((p) => !p.submitted).map((p) => p.name)
  const everyoneIn = waitingOn.length === 0

  // While waiting on other judges, quietly check for their submissions.
  useEffect(() => {
    if (!submitted || everyoneIn) return
    const t = setInterval(() => router.refresh(), 8000)
    return () => clearInterval(t)
  }, [submitted, everyoneIn, router])

  const person = people[index]
  const mine = marks[person.entryId] ?? {}

  const complete = (id: string) => categories.every((c) => typeof (marks[id] ?? {})[c.id] === 'number')
  const partial = (id: string) => categories.some((c) => typeof (marks[id] ?? {})[c.id] === 'number')
  const totalFor = (id: string) =>
    categories.reduce((s, c) => s + (typeof (marks[id] ?? {})[c.id] === 'number' ? ((marks[id] ?? {})[c.id] as number) : 0), 0)

  const doneCount = people.filter((p) => complete(p.entryId)).length
  const allDone = doneCount === people.length
  const maxTotal = categories.reduce((s, c) => s + Number(c.max_score), 0)

  function change(categoryId: string, next: number, max: number) {
    if (submitted) return
    const clamped = Math.max(0, Math.min(max, Math.round(next * 2) / 2))
    setMarks((prev) => ({ ...prev, [person.entryId]: { ...(prev[person.entryId] ?? {}), [categoryId]: clamped } }))
    startTask(async () => {
      const res = await saveMark(person.entryId, categoryId, clamped)
      if (res?.error) setError(res.error)
    })
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

  function submit() {
    // A second tap while the first is in flight would queue another request
    if (submittingRef.current) return
    submittingRef.current = true
    setError(null)
    startTask(async () => {
      try {
        const res = await submitRound(roundId)
        if (res?.error) { setError(res.error); return }
        router.refresh()
      } catch {
        setError('That did not go through. Check your connection and try again.')
      } finally {
        submittingRef.current = false
      }
    })
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
                      {categories.map((c) => (marks[p.entryId] ?? {})[c.id] ?? '\u2014').join('  \u00B7  ')}
                    </span>
                  </span>
                  <span className="mark nums">{totalFor(p.entryId)}<small>/{maxTotal}</small></span>
                </button>
              </li>
            ))}
          </ul>

          {error && <p className="alert" style={{ marginTop: 18 }}>{error}</p>}
        </div>

        <div className="dock">
          {!submitted ? (
            <>
              <button className="btn btn-amber btn-full" onClick={submit} disabled={busy}>
                {busy ? 'Submitting' : 'Submit round'}
              </button>
              <button className="btn btn-quiet btn-full" onClick={() => setView('card')} style={{ marginTop: 6 }}>
                Back to scoring
              </button>
            </>
          ) : everyoneIn ? (
            <a className="btn btn-amber btn-full" href={isFinal ? '/judge/results' : (hasNextRound ? '/judge/shortlist' : '/judge/results')}>
              {isFinal ? 'See the winners' : 'Continue'}
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
        <p className="eyebrow nums">
          Round {String(roundPosition).padStart(2, '0')} &middot; {roundName}{isFinal ? ' \u00B7 Final' : ''}
        </p>

        <div className="chips">
          {people.map((p, i) => (
            <button key={p.entryId} type="button"
              className={'chip' + (complete(p.entryId) ? ' chip-done' : partial(p.entryId) ? ' chip-part' : '') + (i === index ? ' chip-now' : '')}
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
          <span className="label" style={{ margin: 0 }}>Your total</span>
          <span className="running-value nums">{total}<small> / {maxTotal}</small></span>
        </div>

        {categories.map((c) => {
          const v = mine[c.id]
          const has = typeof v === 'number'
          return (
            <div key={c.id} className="cat">
              <div className="cat-top">
                <span className="cat-name">{c.name}</span>
                <span className="cat-value nums">{has ? v : '\u2014'}<small> / {c.max_score}</small></span>
              </div>
              <div className="stepper">
                <button type="button" className="step-btn"
                  onClick={() => change(c.id, (has ? (v as number) : 0) - 0.5, Number(c.max_score))}>&minus;</button>
                <input className="slider" type="range" min={0} max={Number(c.max_score)} step={0.5}
                  value={has ? (v as number) : 0}
                  onChange={(e) => change(c.id, Number(e.target.value), Number(c.max_score))}
                  aria-label={c.name} />
                <button type="button" className="step-btn"
                  onClick={() => change(c.id, (has ? (v as number) : 0) + 0.5, Number(c.max_score))}>+</button>
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

      <div className="dock">
        <div className="nav-row">
          <button className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
          <span className="nav-count nums">{index + 1} of {people.length}</span>
          <button className="btn btn-ghost" disabled={index === people.length - 1} onClick={() => setIndex(index + 1)}>Next</button>
        </div>
        <button className="btn btn-amber btn-full" disabled={!allDone || busy}
          onClick={() => setView('review')} style={{ marginTop: 10 }}>
          {allDone ? 'Review my marks' : 'Scored ' + doneCount + ' of ' + people.length}
        </button>
      </div>
    </>
  )
}
