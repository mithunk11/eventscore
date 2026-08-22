import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fullBreakdown } from '@/lib/breakdown'
import { roundOutcomeDetailed } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

function tidy(n: number | null | undefined) {
  if (n === null || n === undefined) return '\u2013'
  return String(Math.round(n * 10) / 10)
}

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { rounds, judges, rows } = await fullBreakdown(supabase, id)
  const multi = judges.length > 1

  const { data: comments } = await supabase
    .from('entry_comments')
    .select('body, judge_id, entry_id, entries(round_id, contestants(name, bib_number))')
    .not('body', 'is', null)

  return (
    <div className="sheetpage">
      <div className="noprint printbar">
        <a className="btn btn-quiet" href={'/events/' + id + '/results'}>Back</a>
        <span className="sub" style={{ margin: 0 }}>
          Use your browser&rsquo;s Print, then choose Save as PDF. Landscape suits the wide table.
        </span>
      </div>

      <article className="paper paper-wide">
        <header className="paper-head">
          <h1>{event.name}</h1>
          <p>
            {event.event_date ?? ''}{event.venue ? ' \u00B7 ' + event.venue : ''}
            {' \u00B7 '}{judges.length} judge{judges.length === 1 ? '' : 's'}
            {' \u00B7 '}Generated {new Date().toLocaleString('en-IE')}
          </p>
        </header>

        {/* ---- The result ---- */}
        <section className="paper-block">
          <h2>Result</h2>
          <table className="paper-table">
            <thead>
              <tr>
                <th>Place</th><th>Chest</th><th className="tl">Contestant</th>
                <th>Reached</th><th>Total</th><th>Out of</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.contestantId} className={i < (event.winners_count ?? 3) ? 'paper-top' : ''}>
                  <td>{i + 1}</td>
                  <td>{r.bib ?? ''}</td>
                  <td className="tl">{r.name}</td>
                  <td>Round {r.reached}</td>
                  <td><strong>{tidy(r.total)}</strong></td>
                  <td>{r.maxTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ---- Every mark, round by round ---- */}
        {rounds.map((round) => {
          const took = rows.filter((r) => r.roundTotals[round.id] !== null
            && r.roundTotals[round.id] !== undefined)
          if (took.length === 0) return null

          return (
            <section className="paper-block paper-break" key={round.id}>
              <h2>
                Round {round.position} &middot; {round.name}
              </h2>
              <p className="paper-note">
                {round.categories.map((c) => c.name + ' out of ' + c.maxScore).join(' \u00B7 ')}
                {' \u2014 '}{round.perJudgeMax} available from each judge
                {round.categories.length === 0 && 'No categories were set for this round.'}
              </p>

              <table className="paper-table paper-grid">
                <thead>
                  <tr>
                    <th rowSpan={2}>Chest</th>
                    <th rowSpan={2} className="tl">Contestant</th>
                    {judges.map((j) => (
                      <th key={j.id} colSpan={round.categories.length + 1} className="paper-judge">
                        {j.name}
                      </th>
                    ))}
                    <th rowSpan={2}>Round<br />total</th>
                  </tr>
                  <tr>
                    {judges.map((j) => (
                      <>
                        {round.categories.map((c) => (
                          <th key={j.id + c.id} className="paper-cat">{c.name}</th>
                        ))}
                        <th key={j.id + 'sum'} className="paper-sub">Sum</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {took.map((r) => (
                    <tr key={r.contestantId}>
                      <td>{r.bib ?? ''}</td>
                      <td className="tl">{r.name}</td>
                      {judges.map((j) => (
                        <>
                          {round.categories.map((c) => (
                            <td key={j.id + c.id}>
                              {tidy(r.marks[round.id]?.[j.id]?.[c.id] ?? 0)}
                            </td>
                          ))}
                          <td key={j.id + 'sum'} className="paper-sub">
                            <strong>{tidy(r.judgeTotals[round.id]?.[j.id] ?? 0)}</strong>
                          </td>
                        </>
                      ))}
                      <td><strong>{tidy(r.roundTotals[round.id])}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}

        {/* ---- Comments ---- */}
        {(comments ?? []).length > 0 && (
          <section className="paper-block paper-break">
            <h2>Judge comments</h2>
            {(comments ?? []).map((c, i) => {
              const e = c.entries as unknown as {
                round_id: string
                contestants: { name: string; bib_number: string | null }
              }
              const judge = judges.find((j) => j.id === c.judge_id)
              const round = rounds.find((r) => r.id === e?.round_id)
              return (
                <div key={i} className="paper-comment">
                  <p className="paper-note">
                    {e?.contestants?.bib_number ? 'Chest ' + e.contestants.bib_number + ' \u00B7 ' : ''}
                    {e?.contestants?.name}
                    {round ? ' \u00B7 Round ' + round.position : ''}
                    {judge ? ' \u00B7 ' + judge.name : ''}
                  </p>
                  <p style={{ margin: 0 }}>{c.body}</p>
                </div>
              )
            })}
          </section>
        )}

        <footer className="paper-foot">
          Marks are exactly as each judge entered them. Round figures are every judge
          added together, and the total is every round a contestant took part in.
          {multi ? '' : ' A single judge scored this event.'}
        </footer>
      </article>
    </div>
  )
}
