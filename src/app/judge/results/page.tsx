import { redirect } from 'next/navigation'
import { getJudgeSession } from '@/lib/judge-session'
import { roundStandings } from '@/lib/scoring'
import { signedUrls } from '@/lib/media'
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
        <h1 className="display d-xl">The podium</h1>
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
            <div className="podium">
              {order.map((pos) => {
                const w = winners[pos]
                if (!w) return null
                return (
                  <div key={w.entryId} className={'plinth plinth-' + (pos + 1)}>
                    {w.photo && photos[w.photo]
                      ? <img className="plinth-photo" src={photos[w.photo]} alt="" />
                      : <div className="plinth-photo plinth-blank">{w.name.slice(0, 1).toUpperCase()}</div>}
                    <span className="place nums">{pos + 1}</span>
                    <span className="plinth-name">{w.name}</span>
                    {event.show_scores && <span className="plinth-score nums">{w.score.toFixed(1)}%</span>}
                  </div>
                )
              })}
            </div>

            <p className="eyebrow" style={{ marginTop: 34 }}>Full standings</p>
            <ul className="list">
              {standings.map((s, i) => (
                <li key={s.entryId} className="card">
                  <span className="thumb nums">{i + 1}</span>
                  <span className="card-body">
                    <span className="card-title">{s.name}</span>
                    <span className="card-meta nums">{s.judgesIn} judge{s.judgesIn === 1 ? '' : 's'} scored</span>
                  </span>
                  {event.show_scores && <span className="mark nums">{s.score.toFixed(1)}<small>%</small></span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
