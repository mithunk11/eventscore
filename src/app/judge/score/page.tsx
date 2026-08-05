import { redirect } from 'next/navigation'
import { getJudgeSession } from '@/lib/judge-session'
import { ensureRoster } from '@/lib/scoring'
import { signedUrls } from '@/lib/media'
import { JudgeScorecard } from '@/components/JudgeScorecard'
import { signOutJudge } from '../actions'

export default async function JudgeScorePage() {
  const session = await getJudgeSession()
  if (!session) redirect('/judge')
  const { judge, event, db } = session

  const { data: rounds } = await db
    .from('rounds').select('*').eq('event_id', event.id).order('position')
  if (!rounds?.length) return <Waiting title={event.name} message="The organiser has not set up any rounds yet." />

  const { data: mySubs } = await db.from('submissions').select('round_id').eq('judge_id', judge.id)
  const mine = new Set((mySubs ?? []).map((s) => s.round_id))

  const current = rounds.find((r) => !mine.has(r.id))
  if (!current) redirect('/judge/results')

  await ensureRoster(db, current.id)

  const { data: categories } = await db
    .from('categories').select('id, name, max_score').eq('round_id', current.id).order('position')
  if (!categories?.length) {
    return <Waiting title={event.name} message={current.name + ' has no categories yet. The organiser needs to add them.'} />
  }

  const { data: entries } = await db
    .from('entries').select('id, contestants(name, bib_number, description, photo_url)')
    .eq('round_id', current.id)
  if (!entries?.length) return <Waiting title={event.name} message="No contestants are in this round yet." />

  const photos = await signedUrls(db, entries.map((e) => (e.contestants as unknown as { photo_url: string | null }).photo_url))

  const people = entries.map((e) => {
    const c = e.contestants as unknown as { name: string; bib_number: string | null; description: string | null; photo_url: string | null }
    return {
      entryId: e.id, name: c.name, bib: c.bib_number, description: c.description,
      photo: c.photo_url ? photos[c.photo_url] ?? null : null,
    }
  }).sort((a, b) => Number(a.bib ?? 0) - Number(b.bib ?? 0))

  const entryIds = entries.map((e) => e.id)

  const { data: myScores } = await db
    .from('scores').select('entry_id, category_id, value').eq('judge_id', judge.id).in('entry_id', entryIds)

  const initial: Record<string, Record<string, number | null>> = {}
  people.forEach((p) => { initial[p.entryId] = {} })
  for (const s of myScores ?? []) {
    if (!initial[s.entry_id]) initial[s.entry_id] = {}
    initial[s.entry_id][s.category_id] = s.value === null ? null : Number(s.value)
  }

  const { data: myNotes } = await db
    .from('entry_comments').select('entry_id, body').eq('judge_id', judge.id).in('entry_id', entryIds)
  const initialComments: Record<string, string> = {}
  for (const n of myNotes ?? []) initialComments[n.entry_id] = n.body ?? ''

  // Panel status for this round
  const { data: allJudges } = await db
    .from('judges').select('id, name').eq('event_id', event.id).eq('status', 'active').order('position')
  const { data: roundSubs } = await db.from('submissions').select('judge_id').eq('round_id', current.id)
  const submittedIds = new Set((roundSubs ?? []).map((s) => s.judge_id))

  const panel = (allJudges ?? []).map((j) => ({ name: j.name, submitted: submittedIds.has(j.id) }))
  const iSubmitted = submittedIds.has(judge.id)
  const hasNextRound = rounds.some((r) => r.position === current.position + 1)

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <span className="topbar-title">{judge.name}</span>
        <form action={signOutJudge}><button className="btn btn-quiet" type="submit">Leave</button></form>
      </header>

      <JudgeScorecard
        roundId={current.id}
        roundName={current.name}
        roundPosition={current.position}
        isFinal={!current.advance_count}
        categories={categories.map((c) => ({ id: c.id, name: c.name, max_score: Number(c.max_score) }))}
        people={people}
        initial={initial}
        initialComments={initialComments}
        commentsMode={(event.comments_mode ?? 'optional') as 'off' | 'optional' | 'required'}
        submitted={iSubmitted}
        panel={panel}
        hasNextRound={hasNextRound}
      />
    </div>
  )
}

function Waiting({ title, message }: { title: string; message: string }) {
  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar"><span className="topbar-title">{title}</span></header>
      <div className="screen">
        <div className="empty" style={{ marginTop: 40 }}>
          <h2 className="display d-l" style={{ marginBottom: 8 }}>Not ready yet</h2>
          <p className="sub">{message}</p>
        </div>
      </div>
    </div>
  )
}
