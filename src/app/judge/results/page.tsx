import { redirect } from 'next/navigation'
import { getJudgeSession } from '@/lib/judge-session'
import { fullResults } from '@/lib/results'
import { signedUrls } from '@/lib/media'
import { Podium } from '@/components/Podium'
import { signOutJudge } from '../actions'

export const dynamic = 'force-dynamic'

export default async function JudgeResultsPage() {
  const session = await getJudgeSession()
  if (!session) redirect('/judge')
  const { event, db } = session

  const { columns, rows } = await fullResults(db, event.id)
  const photos = await signedUrls(db, rows.map((r) => r.photo))

  const { count: judgeTotal } = await db
    .from('judges').select('id', { count: 'exact', head: true })
    .eq('event_id', event.id).eq('status', 'active')

  const winners = rows.slice(0, event.winners_count ?? 3)

  return (
    <div className="app app-dark">
      <div className="spot" />
      <header className="topbar">
        <span className="topbar-title">{event.name}</span>
        <form action={signOutJudge}><button className="btn btn-quiet" type="submit">Leave</button></form>
      </header>

      <div className="screen">
        <p className="eyebrow">{event.name}</p>
        <h1 className="display d-xl">Final rankings</h1>
        <p className="sub" style={{ marginBottom: 26 }}>
          Marks added across every round. {judgeTotal ?? 0} judge{judgeTotal === 1 ? '' : 's'}.
        </p>

        {rows.length === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>No results yet</h2>
            <p className="sub">Rankings appear once judges submit.</p>
          </div>
        ) : (
          <>
            <Podium
              showMarks={event.show_scores}
              winners={winners.map((w) => ({
                key: w.contestantId,
                name: w.name,
                bib: w.bib,
                photoUrl: w.photo ? photos[w.photo] ?? null : null,
                marks: w.total,
                maxMarks: w.maxTotal,
              }))}
            />

            <p className="eyebrow" style={{ marginTop: 34 }}>Everyone, in order</p>
            <ul className="list">
              {rows.map((r, i) => (
                <li key={r.contestantId} className="card">
                  <span className="thumb nums">{i + 1}</span>
                  <span className="avatar-wrap">
                    {r.photo && photos[r.photo]
                      ? <img className="avatar" src={photos[r.photo]} alt="" />
                      : <span className="thumb">{r.name.slice(0, 1).toUpperCase()}</span>}
                    {r.bib && <span className="bib nums">{r.bib}</span>}
                  </span>
                  <span className="card-body">
                    <span className="card-title">{r.name}</span>
                    <span className="card-meta nums">
                      Reached round {r.reached} of {columns.length}
                    </span>
                  </span>
                  <span className="mark nums">
                    {Math.round(r.total * 10) / 10}<small>/{r.maxTotal}</small>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
