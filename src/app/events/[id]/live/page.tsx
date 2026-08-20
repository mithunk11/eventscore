import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { roundStandings } from '@/lib/scoring'
import { signedUrls } from '@/lib/media'
import { RoundOverride } from '@/components/RoundOverride'
import { BallotWatch } from '@/components/BallotWatch'

export const dynamic = 'force-dynamic'

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: rounds } = await supabase
    .from('rounds').select('*').eq('event_id', id).order('position')
  const { data: judges } = await supabase
    .from('judges').select('id, name, position').eq('event_id', id).eq('status', 'active').order('position')

  const { data: allSubs } = await supabase
    .from('submissions').select('judge_id, round_id')
    .in('round_id', (rounds ?? []).map((r) => r.id))

  // The round in play is the first one not everybody has finished.
  const current = (rounds ?? []).find((r) => {
    const done = (allSubs ?? []).filter((s) => s.round_id === r.id).length
    return !r.force_closed && done < (judges?.length ?? 0)
  }) ?? (rounds ?? [])[rounds!.length - 1]

  const submittedIds = new Set((allSubs ?? []).filter((s) => s.round_id === current?.id).map((s) => s.judge_id))
  const missing = (judges ?? []).filter((j) => !submittedIds.has(j.id)).map((j) => j.name)

  const { data: openBallot } = current
    ? await supabase.from('tiebreaks').select('*')
        .eq('round_id', current.id).eq('status', 'open').maybeSingle()
    : { data: null }

  let ballotNames: string[] = []
  let ballotWaiting: string[] = []
  if (openBallot) {
    const { data: tiedEntries } = await supabase
      .from('entries').select('id, contestants(name)').in('id', openBallot.tied_entry_ids ?? [])
    ballotNames = (tiedEntries ?? []).map(
      (e) => (e.contestants as unknown as { name: string })?.name ?? '?'
    )
    const { data: cast } = await supabase
      .from('judge_votes').select('judge_id').eq('tiebreak_id', openBallot.id)
    const voted = new Set((cast ?? []).map((v) => v.judge_id))
    ballotWaiting = (judges ?? []).filter((j) => !voted.has(j.id)).map((j) => j.name)
  }

  const standings = current ? await roundStandings(supabase, current.id) : []
  const photos = await signedUrls(supabase, standings.map((s) => s.photo))
  const advanceLine = current?.advance_count ?? null

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href={'/events/' + id} aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">Live</span>
        <a className="btn btn-quiet" href={'/events/' + id + '/podium'}>Podium</a>
      </header>

      <div className="screen">
        <p className="eyebrow nums">
          {current ? 'Round ' + String(current.position).padStart(2, '0') + ' \u00B7 ' + current.name : 'No rounds'}
        </p>
        <h1 className="display d-xl">{event.name}</h1>

        <p className="eyebrow eyebrow-quiet" style={{ marginTop: 28 }}>The panel</p>
        <div className="waiting">
          {(judges ?? []).map((j) => (
            <span key={j.id} className={submittedIds.has(j.id) ? 'who who-in' : 'who'}>
              {submittedIds.has(j.id) ? '\u2713 ' : ''}{j.name}
            </span>
          ))}
        </div>

        {openBallot && current && (
          <BallotWatch eventId={id} ballotId={openBallot.id} place={openBallot.place ?? 1}
            names={ballotNames} waitingOn={ballotWaiting} />
        )}

        {current && (
          <RoundOverride eventId={id} roundId={current.id}
            forceClosed={current.force_closed} missing={missing} />
        )}

        <p className="eyebrow" style={{ marginTop: 30 }}>
          {submittedIds.size < (judges?.length ?? 0) ? 'Provisional standings' : 'Standings'}
        </p>
        <p className="sub" style={{ marginTop: 0, marginBottom: 14 }}>
          {submittedIds.size} of {judges?.length ?? 0} judges in
        </p>

        {standings.length === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>No marks yet</h2>
            <p className="sub">Standings appear as judges submit.</p>
          </div>
        ) : (
          <ul className="list">
            {standings.map((s, i) => (
              <li key={s.entryId}>
                {advanceLine !== null && i === advanceLine && (
                  <p className="cutline"><span>Advance line &mdash; top {advanceLine}</span></p>
                )}
                <div className={'card' + (advanceLine !== null && i < advanceLine ? ' card-through' : '')}>
                  <span className="avatar-wrap">
                    {s.photo && photos[s.photo]
                      ? <img className="avatar" src={photos[s.photo]} alt="" />
                      : <span className="thumb">{s.name.slice(0, 1).toUpperCase()}</span>}
                    {s.bib && <span className="bib nums">{s.bib}</span>}
                  </span>
                  <span className="card-body">
                    <span className="card-title">{s.name}</span>
                    <span className="card-meta nums">{s.judgesIn} judge{s.judgesIn === 1 ? '' : 's'} scored</span>
                  </span>
                  <span className="mark nums">{Math.round(s.marks * 10) / 10}<small>/{s.maxMarks}</small></span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dock">
        <a className="btn btn-amber btn-full" href={'/events/' + id + '/export'}>Export results</a>
      </div>
    </div>
  )
}
