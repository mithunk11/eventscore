import type { Standing } from '@/lib/scoring'

function Row({ s, photos, place }: { s: Standing; photos: Record<string, string>; place: number }) {
  return (
    <li className="card">
      <span className="thumb nums">{place}</span>
      <span className="avatar-wrap">
        {s.photo && photos[s.photo]
          ? <img className="avatar" src={photos[s.photo]} alt="" />
          : <span className="thumb">{s.name.slice(0, 1).toUpperCase()}</span>}
        {s.bib && <span className="bib nums">{s.bib}</span>}
      </span>
      <span className="card-body">
        <span className="card-title">{s.name}</span>
        <span className="card-meta nums">
          {s.judgesIn} judge{s.judgesIn === 1 ? '' : 's'} scored
        </span>
      </span>
      <span className="mark nums">
        {Math.round(s.marks * 10) / 10}<small>/{s.maxMarks}</small>
      </span>
    </li>
  )
}

export function OutcomeTables({
  through, out, photos,
}: {
  through: Standing[]; out: Standing[]; photos: Record<string, string>
}) {
  return (
    <>
      <div className="outcome-head outcome-through">
        <span className="outcome-label">Through</span>
        <span className="outcome-count nums">{through.length}</span>
      </div>
      <ul className="list" style={{ marginBottom: 30 }}>
        {through.map((s, i) => (
          <Row key={s.entryId} s={s} photos={photos} place={i + 1} />
        ))}
      </ul>

      {out.length > 0 && (
        <>
          <div className="outcome-head outcome-out">
            <span className="outcome-label">Not through</span>
            <span className="outcome-count nums">{out.length}</span>
          </div>
          <ul className="list outcome-dim">
            {out.map((s, i) => (
              <Row key={s.entryId} s={s} photos={photos} place={through.length + i + 1} />
            ))}
          </ul>
        </>
      )}
    </>
  )
}
