import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fullResults } from '@/lib/results'
import { signedUrls } from '@/lib/media'
import { Podium } from '@/components/Podium'
import { BreakdownTable } from '@/components/BreakdownTable'
import { fullBreakdown } from '@/lib/breakdown'

export const dynamic = 'force-dynamic'

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { columns, rows } = await fullResults(supabase, id)
  const bd = await fullBreakdown(supabase, id)
  const photos = await signedUrls(supabase, rows.map((r) => r.photo).concat([event.logo_url]))

  const winners = rows.slice(0, event.winners_count ?? 3)
  const order = winners.length >= 3 ? [1, 0, 2] : winners.map((_, i) => i)

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href={'/events/' + id} aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">Results</span>
        <a className="btn btn-quiet" href={'/events/' + id + '/podium'}>Stage mode</a>
      </header>

      <div className="screen">
        {event.logo_url && photos[event.logo_url] && (
          <img className="evlogo" src={photos[event.logo_url]} alt="" />
        )}

        <p className="eyebrow">{event.event_date ?? 'Results'}</p>
        <h1 className="display d-xl" style={{ marginBottom: 22 }}>{event.name}</h1>

        {rows.length === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>No results yet</h2>
            <p className="sub">Rankings appear once judges start submitting rounds.</p>
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

            <div className="rank-head">
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Full rankings</p>
                <p className="sub" style={{ marginTop: 4 }}>
                  {rows.length} contestant{rows.length === 1 ? '' : 's'} across {columns.length} round{columns.length === 1 ? '' : 's'}
                </p>
              </div>
              <a className="btn btn-amber" href={'/events/' + id + '/export'}
                style={{ minHeight: 42, padding: '0 20px', fontSize: 14 }}>
                Export PDF
              </a>
            </div>

            <BreakdownTable rounds={bd.rounds} judges={bd.judges} rows={bd.rows} />

            <p className="sub" style={{ fontSize: 12, marginTop: 14 }}>
              A dash means the contestant did not take part in that round. Marks are added across every round a contestant took part in.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
