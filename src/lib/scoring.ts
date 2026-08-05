import type { SupabaseClient } from '@supabase/supabase-js'

export type Standing = {
  entryId: string
  contestantId: string
  name: string
  bib: string | null
  photo: string | null
  score: number
  judgesIn: number
}

/**
 * A judge's percentage for one contestant is the mean of (mark / category max)
 * across every category, times 100. A judge only counts once they have submitted
 * the round AND marked every category. The combined score is the mean across
 * those judges. All categories count equally.
 */
export async function roundStandings(db: SupabaseClient, roundId: string): Promise<Standing[]> {
  const { data: categories } = await db.from('categories').select('id, max_score').eq('round_id', roundId)
  if (!categories || categories.length === 0) return []

  const { data: entries } = await db
    .from('entries')
    .select('id, contestant_id, contestants(name, bib_number, photo_url)')
    .eq('round_id', roundId)
  if (!entries || entries.length === 0) return []

  const { data: subs } = await db.from('submissions').select('judge_id').eq('round_id', roundId)
  const submitted = Array.from(new Set((subs ?? []).map((s) => s.judge_id)))

  const shell = (e: { id: string; contestant_id: string; contestants: unknown }) => {
    const c = e.contestants as { name: string; bib_number: string | null; photo_url: string | null }
    return { entryId: e.id, contestantId: e.contestant_id, name: c.name, bib: c.bib_number, photo: c.photo_url }
  }

  if (submitted.length === 0) {
    return entries.map((e) => ({ ...shell(e), score: 0, judgesIn: 0 }))
  }

  const { data: scores } = await db
    .from('scores')
    .select('judge_id, entry_id, category_id, value')
    .in('entry_id', entries.map((e) => e.id))

  const maxOf = new Map(categories.map((c) => [c.id, Number(c.max_score)]))

  const out: Standing[] = entries.map((e) => {
    const perJudge: number[] = []

    submitted.forEach((judgeId) => {
      const mine = (scores ?? []).filter(
        (s) => s.entry_id === e.id && s.judge_id === judgeId && s.value !== null
      )
      if (mine.length !== categories.length) return
      const sum = mine.reduce((acc, s) => acc + Number(s.value) / (maxOf.get(s.category_id) || 1), 0)
      perJudge.push((sum / categories.length) * 100)
    })

    const score = perJudge.length ? perJudge.reduce((a, b) => a + b, 0) / perJudge.length : 0
    return { ...shell(e), score, judgesIn: perJudge.length }
  })

  return out.sort((a, b) => b.score - a.score || Number(a.bib ?? 0) - Number(b.bib ?? 0))
}

/**
 * Builds a round's line-up if it does not exist yet.
 * Round 1 is everyone. Later rounds take the top N from the round before.
 *
 * Critical rule: once ANY judge has entered a mark for this round the line-up
 * freezes, so later judges score the same people and an early judge is never
 * sent backwards.
 */
export async function ensureRoster(db: SupabaseClient, roundId: string) {
  const { data: round } = await db.from('rounds').select('*').eq('id', roundId).single()
  if (!round) return

  const { data: existing } = await db.from('entries').select('id').eq('round_id', roundId)
  const hasEntries = (existing?.length ?? 0) > 0

  if (hasEntries) {
    const { count } = await db
      .from('scores')
      .select('id', { count: 'exact', head: true })
      .in('entry_id', existing!.map((e) => e.id))
    if ((count ?? 0) > 0) return
  }

  if (round.position === 1) {
    const { data: contestants } = await db
      .from('contestants').select('id').eq('event_id', round.event_id).eq('status', 'active')
    if (!contestants?.length) return
    await db.from('entries').upsert(
      contestants.map((c) => ({ round_id: roundId, contestant_id: c.id })),
      { onConflict: 'round_id,contestant_id', ignoreDuplicates: true }
    )
    return
  }

  const { data: prev } = await db
    .from('rounds').select('*')
    .eq('event_id', round.event_id).eq('position', round.position - 1).maybeSingle()
  if (!prev) return

  const standings = await roundStandings(db, prev.id)
  const advancing = standings.filter((s) => s.judgesIn > 0).slice(0, prev.advance_count ?? 0)
  if (advancing.length === 0) return

  await db.from('entries').delete().eq('round_id', roundId)
  await db.from('entries').insert(
    advancing.map((s) => ({ round_id: roundId, contestant_id: s.contestantId }))
  )
}
