/**
 * Three ascending bars that read as a podium and as an E.
 * `stacked` is the large version for landing and sign-in screens.
 */
export function Brand({
  size = 34,
  stacked = false,
  invert = false,
}: {
  size?: number
  stacked?: boolean
  invert?: boolean
}) {
  const badge = (
    <span className={'mark' + (invert ? ' mark-invert' : '')} style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
        <rect className="mb mb1" x="8"  y="23" width="7" height="11" rx="2.5" />
        <rect className="mb mb2" x="17" y="12" width="7" height="22" rx="2.5" />
        <rect className="mb mb3" x="26" y="18" width="7" height="16" rx="2.5" />
      </svg>
    </span>
  )

  if (stacked) {
    return (
      <span className="lockup lockup-stacked">
        {badge}
        <span className="wordmark" style={{ fontSize: size * 0.82 }}>
          Event<em>Score</em>
        </span>
      </span>
    )
  }

  return (
    <span className="lockup">
      {badge}
      <span className="wordmark" style={{ fontSize: size * 0.56 }}>
        Event<em>Score</em>
      </span>
    </span>
  )
}
