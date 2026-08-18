import { redirect } from 'next/navigation'
import { getJudgeSession } from '@/lib/judge-session'
import { roundStandings } from '@/lib/scoring'
import { signedUrls } from '@/lib/media'
import { Podium } from '@/components/Podium'
import { signOutJudge } from '../actions'

export default async function JudgeResultsPage() {
  const session = await getJudgeSession()
  if (!session) redirect('/judge')

  const { event, db } = session

  const { data: rounds } = await db
    .from('rounds').select('*').eq('event_id', event.id).order('position', { ascending: false })
  const final = rounds?.find((r) => !r.advance_count) ?? rounds?.[0]
  if (!final) redirect('/judge/score')

  const standings = await roundStandings(db, final.id)
  const photos = await signedUrls(db, standings.map((s) => s.photo))

  const { count: judgeTotal } = await db
    .from('judges').select('id', { count: 'exact', head: true })
    .eq('event_id', event.id).eq('status', 'active')

  const judgesIn = standings[0]?.judgesIn ?? 0
  const winners = standings.filter((s) => s.judgesIn > 0).slice(0, event.winners_count ?? 3)
  const order = winners.length >= 3 ? [1, 0, 2] : winners.map((_, i) => i)

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <span className="topbar-title">{event.name}</span>
        <form action={signOutJudge}><button className="btn btn-quiet" type="submit">Leave</button></form>
      </header>

      <div className="screen">
        <p className="eyebrow">{final.name}</p>
        <h1 className="display d-xl">Final rankings</h1>
        <p className="sub" style={{ marginBottom: 26 }}>
          {judgesIn < (judgeTotal ?? 0)
            ? judgesIn + ' of ' + judgeTotal + ' judges in. This updates as the rest submit.'
            : 'All ' + judgesIn + ' judges have submitted. These are the final placings.'}
        </p>

        {winners.length === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>No results yet</h2>
            <p className="sub">Placings appear once at least one judge submits the final round.</p>
          </div>
        ) : (
          <>
            <Podium
              showMarks={event.show_scores}
              winners={winners.map((w) => ({
                key: w.entryId,
                name: w.name,
                bib: w.bib,
                photoUrl: w.photo ? photos[w.photo] ?? null : null,
                marks: w.rawMarks,
                maxMarks: w.maxMarks,
                tied: winners.filter((x) => Math.abs(x.score - w.score) < 0.001).length > 1,
              }))}
            />

            <p className="eyebrow" style={{ marginTop: 34 }}>Everyone, in order</p>
            <ul className="list">
              {standings.map((s, i) => (
                <li key={s.entryId} className="card">
                  <span className="thumb nums">{i + 1}</span>
                  <span className="card-body">
                    <span className="card-title">{s.name}</span>
                    <span className="card-meta nums">{s.judgesIn} judge{s.judgesIn === 1 ? '' : 's'} scored</span>
                  </span>
                  {event.show_scores && <span className="mark nums">{Math.round(s.rawMarks * 10) / 10}<small>/{s.maxMarks}</small></span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
