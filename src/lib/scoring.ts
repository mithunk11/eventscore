import type { SupabaseClient } from '@supabase/supabase-js'
import { compareBib, byBib } from '@/lib/order'

export type Standing = {
  entryId: string
  contestantId: string
  name: string
  bib: string | null
  photo: string | null
  marks: number        // what the judges actually gave, averaged across judges
  maxMarks: number     // the most available in this round
  judgesIn: number
}

/**
 * Marks, plainly.
 *
 * A judge's score for a contestant is the sum of their marks across every
 * category. The contestant's round score is the mean of that across the judges
 * who have submitted.
 *
 * A category the judge never touched counts as zero, matching the screen.
 *
 * There is deliberately no percentage anywhere. An earlier version averaged
 * each category's percentage, which silently gave a category worth 10 marks the
 * same influence as one worth 40 and produced wrong winners.
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

  const maxMarks = categories.reduce((acc, c) => acc + (Number(c.max_score) || 0), 0)

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
  if (submitted.length === 0) {
    return entries.map((e) => ({ ...shell(e), marks: 0, maxMarks, judgesIn: 0 }))
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
    const perJudge = submitted.map((judgeId) => {
      const mine = lookup.get(judgeId)?.get(e.id)
      return categories.reduce((acc, c) => acc + (mine?.get(c.id) ?? 0), 0)
    })

    // Every judge's marks are added together. Three judges giving 30, 50 and 30
    // makes 110, and that is what the contestant carries.
    const marks = perJudge.reduce((a, b) => a + b, 0)

    return { ...shell(e), marks, maxMarks: maxMarks * (perJudge.length || 1), judgesIn: perJudge.length }
  })

  return out.sort((a, b) => b.marks - a.marks || compareBib(a.bib, b.bib))
}

/**
 * Builds a round's line-up if it does not exist yet.
 * Round 1 is everyone. Later rounds take the top N from the round before,
 * by marks.
 *
 * Once any judge has entered a mark the line-up freezes, so later judges score
 * the same people and an early judge is never sent backwards.
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
  if (standings.length === 0) return

  const takeCount = prev.advance_count ?? standings.length
  const advancing = standings.slice(0, takeCount)
  if (advancing.length === 0) return

  await db.from('entries').delete().eq('round_id', roundId)
  await db.from('entries').insert(
    advancing.map((s) => ({ round_id: roundId, contestant_id: s.contestantId }))
  )
}

/**
 * Who went through and who did not, for a completed round.
 * Used by the list judges read out between rounds.
 */
export async function roundOutcome(db: SupabaseClient, roundId: string) {
  const { data: round } = await db
    .from('rounds').select('id, name, position, advance_count').eq('id', roundId).maybeSingle()
  if (!round) return null

  const standings = await roundStandings(db, roundId)
  const cut = round.advance_count ?? standings.length

  return {
    round,
    through: standings.slice(0, cut),
    out: standings.slice(cut),
    isFinal: round.advance_count == null,
  }
}

export type JudgeMark = { judgeId: string; judgeName: string; marks: number }

export type OutcomeRow = {
  entryId: string
  contestantId: string
  name: string
  bib: string | null
  photo: string | null
  roundMarks: number
  roundMax: number
  perJudge: JudgeMark[]
  runningTotal: number
  runningMax: number
}

/**
 * Everything needed for the tables shown between rounds: who went through, who
 * did not, what each judge gave, and the running total across every round so
 * far.
 *
 * Judges and organisers see the same thing. A judge who can check the
 * arithmetic can stand over the result.
 */
export async function roundOutcomeDetailed(db: SupabaseClient, roundId: string) {
  const { data: round } = await db
    .from('rounds').select('id, event_id, name, position, advance_count')
    .eq('id', roundId).maybeSingle()
  if (!round) return null

  const [judgesRes, catsRes, entriesRes, subsRes, priorRoundsRes] = await Promise.all([
    db.from('judges').select('id, name, position')
      .eq('event_id', round.event_id).eq('status', 'active').order('position'),
    db.from('categories').select('id, max_score').eq('round_id', roundId),
    db.from('entries')
      .select('id, contestant_id, contestants(name, bib_number, photo_url)')
      .eq('round_id', roundId),
    db.from('submissions').select('judge_id').eq('round_id', roundId),
    db.from('rounds').select('id, position')
      .eq('event_id', round.event_id).lte('position', round.position).order('position'),
  ])

  const judges = judgesRes.data ?? []
  const categories = catsRes.data ?? []
  const entries = entriesRes.data ?? []
  if (categories.length === 0 || entries.length === 0) return null

  const submitted = new Set((subsRes.data ?? []).map((s) => s.judge_id))
  const activeJudges = judges.filter((j) => submitted.has(j.id))

  const perJudgeMax = categories.reduce((acc, c) => acc + (Number(c.max_score) || 0), 0)
  const roundMax = perJudgeMax * (activeJudges.length || 1)

  const { data: scores } = await db
    .from('scores').select('judge_id, entry_id, category_id, value')
    .in('entry_id', entries.map((e) => e.id))

  // "judgeId|entryId" -> that judge's total for that contestant
  const judgeTotals = new Map<string, number>()
  for (const s of scores ?? []) {
    if (s.value === null) continue
    const key = s.judge_id + '|' + s.entry_id
    judgeTotals.set(key, (judgeTotals.get(key) ?? 0) + Number(s.value))
  }

  // Running totals need every earlier round as well
  const running = new Map<string, { marks: number; max: number }>()
  for (const r of priorRoundsRes.data ?? []) {
    const st = await roundStandings(db, r.id)
    for (const s of st) {
      if (s.judgesIn === 0) continue
      const cur = running.get(s.contestantId) ?? { marks: 0, max: 0 }
      cur.marks += s.marks
      cur.max += s.maxMarks
      running.set(s.contestantId, cur)
    }
  }

  const rows: OutcomeRow[] = entries.map((e) => {
    const c = e.contestants as unknown as {
      name: string; bib_number: string | null; photo_url: string | null
    }

    const perJudge: JudgeMark[] = activeJudges.map((j) => ({
      judgeId: j.id,
      judgeName: j.name,
      marks: judgeTotals.get(j.id + '|' + e.id) ?? 0,
    }))

    const roundMarks = perJudge.reduce((acc, p) => acc + p.marks, 0)
    const run = running.get(e.contestant_id) ?? { marks: roundMarks, max: roundMax }

    return {
      entryId: e.id,
      contestantId: e.contestant_id,
      name: c?.name ?? 'Unknown',
      bib: c?.bib_number ?? null,
      photo: c?.photo_url ?? null,
      roundMarks,
      roundMax,
      perJudge,
      runningTotal: run.marks,
      runningMax: run.max,
    }
  })

  rows.sort((a, b) => b.roundMarks - a.roundMarks || compareBib(a.bib, b.bib))

  const cut = round.advance_count ?? rows.length

  return {
    round,
    judges: activeJudges.map((j) => ({ id: j.id, name: j.name })),
    through: rows.slice(0, cut),
    out: rows.slice(cut),
    isFinal: round.advance_count == null,
    perJudgeMax,
  }
}
