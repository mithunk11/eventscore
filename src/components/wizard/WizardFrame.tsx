'use client'

import { useRouter } from 'next/navigation'

export const STEPS = [
  { key: 'basics', label: 'Event' },
  { key: 'rounds', label: 'Rounds' },
  { key: 'categories', label: 'Marks' },
  { key: 'contestants', label: 'Who' },
  { key: 'judges', label: 'Judges' },
  { key: 'settings', label: 'Options' },
  { key: 'done', label: 'Finish' },
] as const

export function WizardFrame({
  eventId, step, title, blurb, children, canSkip = true, nextLabel = 'Continue',
}: {
  eventId: string
  step: number
  title: string
  blurb?: string
  children: React.ReactNode
  canSkip?: boolean
  nextLabel?: string
}) {
  const router = useRouter()
  const base = '/events/' + eventId + '/setup?step='

  const go = (n: number) => router.push(base + n)

  return (
    <div className="app">
      <div className="spot" />

      <header className="topbar">
        <a className="back" href={'/events/' + eventId} aria-label="Leave setup">&lsaquo;</a>
        <span className="topbar-title">Setting up</span>
        <a className="btn btn-quiet" href={'/events/' + eventId}>Finish later</a>
      </header>

      <div className="wiz-rail">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            className={'wiz-dot' + (i === step ? ' wiz-now' : i < step ? ' wiz-done' : '')}
            onClick={() => go(i)}
            aria-label={s.label}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="wiz-dot-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="screen wiz-screen">
        <p className="eyebrow nums">Step {step + 1} of {STEPS.length}</p>
        <h1 className="display d-xl">{title}</h1>
        {blurb && <p className="sub" style={{ marginBottom: 26 }}>{blurb}</p>}
        {children}
      </div>

      <div className="dock">
        <div className="wiz-nav">
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => go(step - 1)}>
            Back
          </button>
          {canSkip && step < STEPS.length - 1 && (
            <button className="btn btn-quiet" onClick={() => go(step + 1)}>Skip</button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn btn-amber" onClick={() => go(step + 1)}>{nextLabel}</button>
          ) : (
            <a className="btn btn-amber" href={'/events/' + eventId}>Done</a>
          )}
        </div>
      </div>
    </div>
  )
}
