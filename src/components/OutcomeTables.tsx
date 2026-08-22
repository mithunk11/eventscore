import type { OutcomeRow } from '@/lib/scoring'

function tidy(n: number) {
  return Math.round(n * 10) / 10
}

function Row({
  row, photos, place, judgeCount, showRunning,
}: {
  row: OutcomeRow
  photos: Record<string, string>
  place: number
  judgeCount: number
  showRunning: boolean
}) {
  return (
    <li className="ocard">
      <div className="ocard-top">
        <span className="oplace nums">{place}</span>

        <span className="avatar-wrap">
          {row.photo && photos[row.photo]
            ? <img className="avatar" src={photos[row.photo]} alt="" />
            : <span className="thumb">{row.name.slice(0, 1).toUpperCase()}</span>}
          {row.bib && <span className="bib nums">{row.bib}</span>}
        </span>

        <span className="card-body">
          <span className="card-title">{row.name}</span>
          {showRunning && (
            <span className="card-meta nums">
              Running total {tidy(row.runningTotal)}/{row.runningMax}
            </span>
          )}
        </span>

        <span className="oscore nums">
          {tidy(row.roundMarks)}<small>/{row.roundMax}</small>
        </span>
      </div>

      {judgeCount > 1 && (
        <div className="ojudges">
          {row.perJudge.map((j) => (
            <span key={j.judgeId} className="ojudge">
              <span className="ojudge-name">{j.judgeName}</span>
              <span className="ojudge-mark nums">{tidy(j.marks)}</span>
            </span>
          ))}
        </div>
      )}
    </li>
  )
}

export function OutcomeTables({
  through, out, photos, judgeCount, showRunning = true,
}: {
  through: OutcomeRow[]
  out: OutcomeRow[]
  photos: Record<string, string>
  judgeCount: number
  showRunning?: boolean
}) {
  return (
    <>
      <div className="outcome-head outcome-through">
        <span className="outcome-label">Going through</span>
        <span className="outcome-count nums">{through.length}</span>
      </div>
      <ul className="list" style={{ marginBottom: 30 }}>
        {through.map((r, i) => (
          <Row key={r.entryId} row={r} photos={photos} place={i + 1}
            judgeCount={judgeCount} showRunning={showRunning} />
        ))}
      </ul>

      {out.length > 0 && (
        <>
          <div className="outcome-head outcome-out">
            <span className="outcome-label">Not going through</span>
            <span className="outcome-count nums">{out.length}</span>
          </div>
          <ul className="list outcome-dim">
            {out.map((r, i) => (
              <Row key={r.entryId} row={r} photos={photos} place={through.length + i + 1}
                judgeCount={judgeCount} showRunning={showRunning} />
            ))}
          </ul>
        </>
      )}
    </>
  )
}
