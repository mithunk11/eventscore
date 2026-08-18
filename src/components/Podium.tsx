type Winner = {
  key: string
  name: string
  bib: string | null
  photoUrl: string | null
  marks: number
  maxMarks: number
  tied?: boolean
}

/**
 * Classic podium: first tallest in the centre, second to the left,
 * third to the right. The place number sits ON the block, drawn from the
 * real placing rather than from an array index that gets reordered.
 */
export function Podium({ winners, showMarks = true }: { winners: Winner[]; showMarks?: boolean }) {
  if (winners.length === 0) return null

  // Visual order: 2nd, 1st, 3rd. Each keeps its true place.
  const layout =
    winners.length >= 3 ? [winners[1], winners[0], winners[2]] :
    winners.length === 2 ? [winners[1], winners[0]] :
    [winners[0]]

  const placeOf = (w: Winner) => winners.findIndex((x) => x.key === w.key) + 1

  return (
    <div className={'pod-stage pod-of-' + layout.length}>
      {layout.map((w) => {
        if (!w) return null
        const place = placeOf(w)
        return (
          <div key={w.key} className={'pod-col pod-place-' + place}>
            <div className="pod-person">
              {w.photoUrl
                ? <img className="pod-photo" src={w.photoUrl} alt="" />
                : <div className="pod-photo pod-photo-blank">{w.name.slice(0, 1).toUpperCase()}</div>}

              <span className="pod-name">{w.name}</span>
              {w.bib && <span className="pod-bib nums">Chest {w.bib}</span>}
              {showMarks && (
                <span className="pod-marks nums">
                  {Math.round(w.marks * 10) / 10}<small>/{w.maxMarks}</small>
                </span>
              )}
              {w.tied && <span className="pod-tied">Tied</span>}
            </div>

            <div className="pod-block">
              <span className="pod-place nums">{place}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
