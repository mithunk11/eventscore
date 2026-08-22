import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { roundOutcomeDetailed } from '@/lib/scoring'
import { signedUrls } from '@/lib/media'
import { OutcomeTables } from '@/components/OutcomeTables'

export const dynamic = 'force-dynamic'

export default async function OutcomePage({
  params,
}: {
  params: Promise<{ id: string; roundId: string }>
}) {
  const { id, roundId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('name').eq('id', id).single()
  if (!event) notFound()

  const outcome = await roundOutcomeDetailed(supabase, roundId)
  if (!outcome) {
    return (
      <div className="app">
        <div className="spot" />
        <header className="topbar">
          <a className="back" href={'/events/' + id + '/rounds/' + roundId} aria-label="Back">&lsaquo;</a>
          <span className="topbar-title">Round result</span>
        </header>
        <div className="screen">
          <div className="empty" style={{ marginTop: 30 }}>
            <h2 className="display d-l" style={{ marginBottom: 8 }}>Nothing yet</h2>
            <p className="sub">Results appear once judges start submitting this round.</p>
          </div>
        </div>
      </div>
    )
  }

  const photos = await signedUrls(supabase,
    [...outcome.through, ...outcome.out].map((r) => r.photo))

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href={'/events/' + id + '/rounds/' + roundId} aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">Round result</span>
      </header>

      <div className="screen">
        <p className="eyebrow nums">
          Round {String(outcome.round.position).padStart(2, '0')} &middot; {outcome.round.name}
        </p>
        <h1 className="display d-xl">
          {outcome.isFinal ? 'Final placings' : 'Current rankings'}
        </h1>
        <p className="sub" style={{ marginBottom: 22 }}>
          {outcome.judges.length} judge{outcome.judges.length === 1 ? '' : 's'} submitted,
          each marking out of {outcome.perJudgeMax}.
          {outcome.isFinal ? '' : ` The top ${outcome.round.advance_count} go through.`}
        </p>

        <OutcomeTables through={outcome.through} out={outcome.out} photos={photos}
          judgeCount={outcome.judges.length} />
      </div>
    </div>
  )
}
