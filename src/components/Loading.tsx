/** A page-level skeleton, used by Next.js loading.tsx files. */
export function PageSkeleton({ rows = 4, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <span className="sk sk-pill" style={{ width: 120, height: 20 }} />
      </header>
      <div className="screen">
        {title && (
          <>
            <span className="sk sk-pill" style={{ width: 90, height: 12, marginBottom: 14 }} />
            <span className="sk sk-pill" style={{ width: '70%', height: 34, marginBottom: 26 }} />
          </>
        )}
        <div className="sk-list">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="sk-card" style={{ animationDelay: i * 0.07 + 's' }}>
              <span className="sk sk-square" />
              <span className="sk-lines">
                <span className="sk sk-pill" style={{ width: '55%', height: 16 }} />
                <span className="sk sk-pill" style={{ width: '35%', height: 11 }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** A small spinner for inside buttons. */
export function Spinner({ label }: { label?: string }) {
  return (
    <span className="btn-working">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
  )
}

/** Quiet, persistent indicator of whether work has reached the server. */
export function SaveState({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null
  return (
    <span className={'savestate savestate-' + state} role="status" aria-live="polite">
      {state === 'saving' && <><span className="dot-pulse" aria-hidden="true" />Saving</>}
      {state === 'saved' && <>&#10003; Saved</>}
      {state === 'error' && <>Not saved</>}
    </span>
  )
}
