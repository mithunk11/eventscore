/**
 * Three blocks in the 2-1-3 arrangement of a podium.
 * Universal to any competition: a spelling bee, a dog show, a fashion show.
 * `badge` wraps it in a dark tile. `stacked` puts the wordmark underneath.
 */
export function Brand({
  size = 38,
  stacked = false,
  badge = false,
}: {
  size?: number
  stacked?: boolean
  badge?: boolean
}) {
  const mark = (
    <span className={'podmark' + (badge ? ' podmark-badge' : '')} style={{ width: size, height: size }}>
      <svg viewBox="0 0 44 44" width="100%" height="100%" aria-hidden="true">
        <defs>
          <linearGradient id="pg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF7DAE" /><stop offset="100%" stopColor="#D62B72" />
          </linearGradient>
          <linearGradient id="pg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFC862" /><stop offset="100%" stopColor="#E08A00" />
          </linearGradient>
          <linearGradient id="pg3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5FE0C6" /><stop offset="100%" stopColor="#12A085" />
          </linearGradient>
        </defs>

        <rect className="pod pod2" x="5"    y="22" width="10" height="15" rx="3.4" fill="url(#pg1)" />
        <rect className="pod pod1" x="17.2" y="8"  width="10" height="29" rx="3.4" fill="url(#pg2)" />
        <rect className="pod pod3" x="29.4" y="16" width="10" height="21" rx="3.4" fill="url(#pg3)" />

        <rect className="podbase" x="3" y="37.5" width="38" height="5" rx="2.5" />
      </svg>
    </span>
  )

  if (stacked) {
    return (
      <span className="lockup lockup-stacked">
        {mark}
        <span className="wordmark" style={{ fontSize: size * 0.74 }}>
          Event<em>Score</em>
        </span>
      </span>
    )
  }

  return (
    <span className="lockup">
      {mark}
      <span className="wordmark" style={{ fontSize: size * 0.52 }}>
        Event<em>Score</em>
      </span>
    </span>
  )
}
