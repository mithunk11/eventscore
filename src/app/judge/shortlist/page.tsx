import { redirect } from 'next/navigation'
import { getJudgeSession } from '@/lib/judge-session'
import { ensureRoster, roundOutcome } from '@/lib/scoring'
import { signedUrls } from '@/lib/media'
import { signOutJudge } from '../actions'
import { OutcomeTables } from '@/components/OutcomeTables'

export const dynamic = 'force-dynamic'

/** Between rounds: the list judges read out. Who is through, and who is not. */
export default async function ShortlistPage() {
  const session = await getJudgeSession()
  if (!session) redirect('/judge')
  const { judge, event, db } = session

  const { data: rounds } = await db
    .from('rounds').select('*').eq('event_id', event.id).order('position')
  if (!rounds?.length) redirect('/judge/score')

  const { data: subs } = await db.from('submissions').select('round_id').eq('judge_id', judge.id)
  const mine = new Set((subs ?? []).map((s) => s.round_id))

  const next = rounds.find((r) => !mine.has(r.id))
  if (!next || next.position === 1) redirect('/judge/score')

  const previous = rounds.find((r) => r.position === next.position - 1)
  if (!previous) redirect('/judge/score')

  const outcome = await roundOutcome(db, previous.id)
  if (!outcome) redirect('/judge/score')

  await ensureRoster(db, next.id)

  const photos = await signedUrls(db,
    [...outcome.through, ...outcome.out].map((s) => s.photo))

  return (
    <div className="app app-dark">
      <div className="spot" />
      <header className="topbar">
        <span className="topbar-title">{judge.name}</span>
        <form action={signOutJudge}><button className="btn btn-quiet" type="submit">Leave</button></form>
      </header>

      <div className="screen">
        <p className="eyebrow nums">
          After round {String(previous.position).padStart(2, '0')} &middot; {previous.name}
        </p>
        <h1 className="display d-xl">Who goes through</h1>
        <p className="sub" style={{ marginBottom: 24 }}>
          Read this out before {next.name} begins.
        </p>

        <OutcomeTables through={outcome.through} out={outcome.out} photos={photos} />
      </div>

      <div className="dock">
        <a className="btn btn-amber btn-full" href="/judge/score">Begin {next.name}</a>
      </div>
    </div>
  )
}
