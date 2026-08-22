import { redirect } from 'next/navigation'
import { getJudgeSession } from '@/lib/judge-session'
import { signedUrls } from '@/lib/media'
import { compareBib } from '@/lib/order'
import { TieBallot } from '@/components/TieBallot'
import { signOutJudge } from '../actions'

export const dynamic = 'force-dynamic'

export default async function BallotPage() {
  const session = await getJudgeSession()
  if (!session) redirect('/judge')
  const { judge, event, db } = session

  const { data: rounds } = await db
    .from('rounds').select('id, position').eq('event_id', event.id).order('position')
  const roundIds = (rounds ?? []).map((r) => r.id)

  // The one still open, or the one just settled that this judge voted in
  const { data: open } = await db
    .from('tiebreaks').select('*')
    .in('round_id', roundIds).eq('status', 'open')
    .order('place').limit(1).maybeSingle()

  let ballot = open
  let resolved = false

  if (!ballot) {
    const { data: recent } = await db
      .from('tiebreaks').select('*')
      .in('round_id', roundIds).eq('status', 'resolved')
      .order('resolved_at', { ascending: false }).limit(1).maybeSingle()

    if (recent) {
      const { data: myVote } = await db
        .from('judge_votes').select('judge_id')
        .eq('tiebreak_id', recent.id).eq('judge_id', judge.id).maybeSingle()
      if (myVote) { ballot = recent; resolved = true }
    }
  }

  if (!ballot) redirect('/judge/score')

  const { data: entries } = await db
    .from('entries').select('id, contestants(name, bib_number, photo_url)')
    .in('id', ballot.tied_entry_ids ?? [])

  const photos = await signedUrls(db, (entries ?? []).map(
    (e) => (e.contestants as unknown as { photo_url: string | null }).photo_url
  ))

  const contenders = (entries ?? []).map((e) => {
    const c = e.contestants as unknown as {
      name: string; bib_number: string | null; photo_url: string | null
    }
    return {
      entryId: e.id, name: c.name, bib: c.bib_number,
      photo: c.photo_url ? photos[c.photo_url] ?? null : null,
    }
  }).sort((a, b) => compareBib(a.bib, b.bib))

  const { data: myVote } = await db
    .from('judge_votes').select('chosen_entry_id')
    .eq('tiebreak_id', ballot.id).eq('judge_id', judge.id).maybeSingle()

  const { data: allJudges } = await db
    .from('judges').select('id, name')
    .eq('event_id', event.id).eq('status', 'active').order('position')
  const { data: cast } = await db
    .from('judge_votes').select('judge_id').eq('tiebreak_id', ballot.id)
  const voted = new Set((cast ?? []).map((v) => v.judge_id))
  const waitingOn = (allJudges ?? []).filter((j) => !voted.has(j.id)).map((j) => j.name)

  return (
    <div className="app app-dark">
      <div className="spot" />
      <header className="topbar">
        <span className="topbar-title">{judge.name}</span>
        <form action={signOutJudge}><button className="btn btn-quiet" type="submit">Leave</button></form>
      </header>

      <TieBallot
        ballotId={ballot.id}
        place={ballot.place ?? 1}
        contenders={contenders}
        alreadyVoted={myVote?.chosen_entry_id ?? null}
        waitingOn={waitingOn}
        resolved={resolved}
        nextHref="/judge/shortlist"
      />
    </div>
  )
}
