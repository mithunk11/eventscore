import type { SupabaseClient } from '@supabase/supabase-js'

export type Standing = {
  entryId: string
  contestantId: string
  name: string
  bib: string | null
  photo: string | null
  score: number        // percentage, used for ranking across rounds
  rawMarks: number     // actual marks, averaged across judges
  maxMarks: number     // the most available in this round
  judgesIn: number
}

/**
 * A judge's percentage for one contestant is the mean of (mark / category max)
 * across every category, times 100.
 *
 * A category the judge never touched counts as ZERO, matching what the judge
 * sees on screen. Previously a missing row meant "not scored", which silently
 * dropped contestants out of the standings and stopped them advancing.
 *
 * A judge counts once they have submitted the round. The combined score is the
 * mean across those judges. All categories count equally.
 */
export async function roundStandings(db: SupabaseClient, roundId: string): Promise<Standing[]> {
  const [catsRes, entriesRes, subsRes] = await Promise.all([
    db.from('categories').select('id, max_score').eq('round_id', roundId),
    db.from('entries')
      .select('id, contestant_id, contestants(name, bib_number, photo_url)')
      .eq('round_id', roundId),
    db.from('submissions').select('judge_id').eq('round_id', roundId),
  ])

  const categories = catsRes.data ?? []
  const entries = entriesRes.data ?? []
  if (categories.length === 0 || entries.length === 0) return []

  const shell = (e: { id: string; contestant_id: string; contestants: unknown }) => {
    const c = e.contestants as { name: string; bib_number: string | null; photo_url: string | null }
    return {
      entryId: e.id,
      contestantId: e.contestant_id,
      name: c?.name ?? 'Unknown',
      bib: c?.bib_number ?? null,
      photo: c?.photo_url ?? null,
    }
  }

  const submitted = Array.from(new Set((subsRes.data ?? []).map((s) => s.judge_id)))
  const maxMarks = categories.reduce((acc, c) => acc + (Number(c.max_score) || 0), 0)

  if (submitted.length === 0) {
    return entries.map((e) => ({ ...shell(e), score: 0, rawMarks: 0, maxMarks, judgesIn: 0 }))
  }

  const { data: scores } = await db
    .from('scores')
    .select('judge_id, entry_id, category_id, value')
    .in('entry_id', entries.map((e) => e.id))

  // judgeId -> entryId -> categoryId -> mark
  const lookup = new Map<string, Map<string, Map<string, number>>>()
  for (const s of scores ?? []) {
    if (s.value === null) continue
    if (!lookup.has(s.judge_id)) lookup.set(s.judge_id, new Map())
    const byEntry = lookup.get(s.judge_id)!
    if (!byEntry.has(s.entry_id)) byEntry.set(s.entry_id, new Map())
    byEntry.get(s.entry_id)!.set(s.category_id, Number(s.value))
  }

  const out: Standing[] = entries.map((e) => {
    const perJudgePct: number[] = []
    const perJudgeRaw: number[] = []

    for (const judgeId of submitted) {
      const mine = lookup.get(judgeId)?.get(e.id)
      let pct = 0
      let raw = 0
      for (const c of categories) {
        const mark = mine?.get(c.id) ?? 0        // missing means zero
        raw += mark
        pct += mark / (Number(c.max_score) || 1)
      }
      perJudgePct.push((pct / categories.length) * 100)
      perJudgeRaw.push(raw)
    }

    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

    return {
      ...shell(e),
      score: mean(perJudgePct),
      rawMarks: mean(perJudgeRaw),
      maxMarks,
      judgesIn: perJudgePct.length,
    }
  })

  return out.sort((a, b) => b.score - a.score || Number(a.bib ?? 0) - Number(b.bib ?? 0))
}

/**
 * Builds a round's line-up if it does not exist yet.
 * Round 1 is everyone. Later rounds take the top N from the round before.
 *
 * Once any judge has entered a mark for this round the line-up freezes, so
 * later judges score the same people and an early judge is never sent backwards.
 */
export async function ensureRoster(db: SupabaseClient, roundId: string) {
  const { data: round } = await db.from('rounds').select('*').eq('id', roundId).maybeSingle()
  if (!round) return

  const { data: existing } = await db.from('entries').select('id').eq('round_id', roundId)
  const hasEntries = (existing?.length ?? 0) > 0

  if (hasEntries) {
    const { count } = await db
      .from('scores')
      .select('id', { count: 'exact', head: true })
      .in('entry_id', existing!.map((e) => e.id))
    if ((count ?? 0) > 0) return   // frozen: someone is already scoring it
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
  if (standings.length === 0) return

  // Everyone in the previous round now has a score, zeros included, so the
  // top N is always a full N rather than only those marked in every category.
  const takeCount = prev.advance_count ?? standings.length
  const advancing = standings.slice(0, takeCount)
  if (advancing.length === 0) return

  await db.from('entries').delete().eq('round_id', roundId)
  await db.from('entries').insert(
    advancing.map((s) => ({ round_id: roundId, contestant_id: s.contestantId }))
  )
}
