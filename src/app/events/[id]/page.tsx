import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AddRound } from '@/components/AddRound'

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: rounds } = await supabase
    .from('rounds').select('*').eq('event_id', id).order('position')

  const { count: contestants } = await supabase
    .from('contestants').select('*', { count: 'exact', head: true }).eq('event_id', id)

  const { count: judges } = await supabase
    .from('judges').select('*', { count: 'exact', head: true }).eq('event_id', id)

  const roundCount = rounds?.length ?? 0
  const contestantCount = contestants ?? 0
  const judgeCount = judges ?? 0
  const hasFinal = rounds?.some((r) => !r.advance_count) ?? false

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href="/dashboard" aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">{event.name}</span>
      </header>

      <div className="screen">
        <p className="eyebrow nums">{event.event_date ?? 'No date set'}</p>
        <h1 className="display d-xl">{event.name}</h1>

        <div className="stats">
          <div className="stat"><span className="stat-label">Rounds</span><span className="stat-value nums">{roundCount}</span></div>
          <div className="stat"><span className="stat-label">Contestants</span><span className="stat-value nums">{contestantCount}</span></div>
          <div className="stat"><span className="stat-label">Judges</span><span className="stat-value nums">{judgeCount}</span></div>
        </div>

        <p className="eyebrow eyebrow-quiet">Before you can score</p>
        <ul className="list" style={{ marginBottom: 30 }}>
          <li>
            <a className="step" href={'/events/' + id + '/contestants'}>
              <span className={contestantCount > 0 ? 'dot dot-done' : 'dot'}>{contestantCount > 0 ? '\u2713' : ''}</span>
              <span className="card-body">
                <span className="card-title d-m">Contestants</span>
                <span className="card-meta">{contestantCount || 'None'} added</span>
              </span>
              <span className="chev">&rsaquo;</span>
            </a>
          </li>
          <li>
            <a className="step" href={'/events/' + id + '/judges'}>
              <span className={judgeCount > 0 ? 'dot dot-done' : 'dot'}>{judgeCount > 0 ? '\u2713' : ''}</span>
              <span className="card-body">
                <span className="card-title d-m">Judges</span>
                <span className="card-meta">{judgeCount || 'None'} invited</span>
              </span>
              <span className="chev">&rsaquo;</span>
            </a>
          </li>
        </ul>

        <p className="eyebrow">The running order</p>
        {roundCount > 0 && !hasFinal && (
          <p className="alert">No round ends the event. Mark your last round as the final.</p>
        )}

        {roundCount === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>No rounds yet</h2>
            <p className="sub">Add a round for each stage. Contestants who place highly move on.</p>
          </div>
        ) : (
          <ul className="list">
            {rounds!.map((round) => {
              const isFinal = !round.advance_count
              return (
                <li key={round.id}>
                  <a className="card" href={'/events/' + id + '/rounds/' + round.id}>
                    <span className="thumb nums">{String(round.position).padStart(2, '0')}</span>
                    <span className="card-body">
                      <span className="card-title">{round.name}</span>
                      <span className="card-meta">{isFinal ? 'Decides the winners' : 'Top ' + round.advance_count + ' advance'}</span>
                    </span>
                    {isFinal ? <span className="tag tag-final">Final</span> : <span className="chev">&rsaquo;</span>}
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="dock">
        <AddRound eventId={id} nextPosition={roundCount + 1} />
      </div>
    </div>
  )
}
