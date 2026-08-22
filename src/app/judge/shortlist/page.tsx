import { redirect } from 'next/navigation'
import { getJudgeSession } from '@/lib/judge-session'
import { ensureRoster, roundOutcomeDetailed } from '@/lib/scoring'
import { signedUrls } from '@/lib/media'
import { signOutJudge } from '../actions'
import { OutcomeTables } from '@/components/OutcomeTables'

export const dynamic = 'force-dynamic'

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
  const previous = next
    ? rounds.find((r) => r.position === next.position - 1)
    : rounds[rounds.length - 1]

  if (!previous) redirect('/judge/score')

  const outcome = await roundOutcomeDetailed(db, previous.id)
  if (!outcome) redirect('/judge/score')

  if (next) await ensureRoster(db, next.id)

  const photos = await signedUrls(db,
    [...outcome.through, ...outcome.out].map((r) => r.photo))

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
        <h1 className="display d-xl">Current rankings</h1>
        <p className="sub" style={{ marginBottom: 22 }}>
          {outcome.judges.length === 1
            ? 'Your marks, out of ' + outcome.perJudgeMax + ' for this round.'
            : outcome.judges.length + ' judges, each marking out of ' + outcome.perJudgeMax + '.'}
          {next ? ' Read this out before ' + next.name + ' begins.' : ''}
        </p>

        <OutcomeTables through={outcome.through} out={outcome.out} photos={photos}
          judgeCount={outcome.judges.length} />
      </div>

      <div className="dock">
        {next ? (
          <a className="btn btn-amber btn-full" href="/judge/score">Begin {next.name}</a>
        ) : (
          <a className="btn btn-amber btn-full" href="/judge/results">See final rankings</a>
        )}
      </div>
    </div>
  )
}
