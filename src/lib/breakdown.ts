import type { SupabaseClient } from '@supabase/supabase-js'
import { compareBib } from '@/lib/order'

export type Cat = { id: string; name: string; maxScore: number }
export type RoundBlock = {
  id: string
  name: string
  position: number
  categories: Cat[]
  perJudgeMax: number
}
export type JudgeRef = { id: string; name: string; position: number }

export type CellSet = Record<string, number | null>     // categoryId -> mark

export type BreakdownRow = {
  contestantId: string
  name: string
  bib: string | null
  /** roundId -> judgeId -> categoryId -> mark */
  marks: Record<string, Record<string, CellSet>>
  /** roundId -> judgeId -> that judge's total for the round */
  judgeTotals: Record<string, Record<string, number>>
  /** roundId -> every judge added together */
  roundTotals: Record<string, number | null>
  total: number
  maxTotal: number
  reached: number
}

/**
 * Every mark given, arranged for a table.
 *
 * This is the record that settles an argument: which judge gave what, in which
 * category, in which round.
 */
export async function fullBreakdown(db: SupabaseClient, eventId: string) {
  const { data: roundRows } = await db
    .from('rounds').select('id, name, position').eq('event_id', eventId).order('position')

  const roundIds = (roundRows ?? []).map((r) => r.id)

  const [catsRes, judgesRes, contestantsRes, entriesRes, subsRes] = await Promise.all([
    db.from('categories').select('id, name, max_score, round_id, position')
      .in('round_id', roundIds).order('position'),
    db.from('judges').select('id, name, position')
      .eq('event_id', eventId).eq('status', 'active').order('position'),
    db.from('contestants').select('id, name, bib_number')
      .eq('event_id', eventId).eq('status', 'active'),
    db.from('entries').select('id, round_id, contestant_id').in('round_id', roundIds),
    db.from('submissions').select('judge_id, round_id').in('round_id', roundIds),
  ])

  const cats = catsRes.data ?? []
  const judges: JudgeRef[] = (judgesRes.data ?? []).map((j) => ({
    id: j.id, name: j.name, position: j.position,
  }))
  const entries = entriesRes.data ?? []

  const rounds: RoundBlock[] = (roundRows ?? []).map((r) => {
    const mine = cats.filter((c) => c.round_id === r.id)
      .map((c) => ({ id: c.id, name: c.name, maxScore: Number(c.max_score) }))
    return {
      id: r.id, name: r.name, position: r.position,
      categories: mine,
      perJudgeMax: mine.reduce((a, c) => a + c.maxScore, 0),
    }
  })

  // Which judges actually submitted each round
  const submittedBy = new Map<string, Set<string>>()
  for (const s of subsRes.data ?? []) {
    if (!submittedBy.has(s.round_id)) submittedBy.set(s.round_id, new Set())
    submittedBy.get(s.round_id)!.add(s.judge_id)
  }

  const { data: scores } = await db
    .from('scores').select('judge_id, entry_id, category_id, value')
    .in('entry_id', entries.map((e) => e.id))

  const entryOf = new Map<string, { roundId: string; contestantId: string }>()
  for (const e of entries) {
    entryOf.set(e.id, { roundId: e.round_id, contestantId: e.contestant_id })
  }

  // contestantId -> roundId -> judgeId -> categoryId -> mark
  const grid = new Map<string, Record<string, Record<string, CellSet>>>()
  for (const s of scores ?? []) {
    const link = entryOf.get(s.entry_id)
    if (!link || s.value === null) continue
    if (!grid.has(link.contestantId)) grid.set(link.contestantId, {})
    const byRound = grid.get(link.contestantId)!
    if (!byRound[link.roundId]) byRound[link.roundId] = {}
    if (!byRound[link.roundId][s.judge_id]) byRound[link.roundId][s.judge_id] = {}
    byRound[link.roundId][s.judge_id][s.category_id] = Number(s.value)
  }

  const tookPart = new Set(entries.map((e) => e.round_id + '|' + e.contestant_id))

  const rows: BreakdownRow[] = (contestantsRes.data ?? []).map((c) => {
    const marks = grid.get(c.id) ?? {}
    const judgeTotals: Record<string, Record<string, number>> = {}
    const roundTotals: Record<string, number | null> = {}

    let total = 0
    let maxTotal = 0
    let reached = 0

    for (const r of rounds) {
      if (!tookPart.has(r.id + '|' + c.id)) {
        roundTotals[r.id] = null
        continue
      }

      const submitted = submittedBy.get(r.id) ?? new Set()
      if (submitted.size === 0) {
        roundTotals[r.id] = null
        continue
      }

      judgeTotals[r.id] = {}
      let roundSum = 0

      for (const j of judges) {
        if (!submitted.has(j.id)) continue
        const cells = marks[r.id]?.[j.id] ?? {}
        const jt = r.categories.reduce((a, cat) => a + (cells[cat.id] ?? 0), 0)
        judgeTotals[r.id][j.id] = jt
        roundSum += jt
      }

      roundTotals[r.id] = roundSum
      total += roundSum
      maxTotal += r.perJudgeMax * submitted.size
      reached = r.position
    }

    return {
      contestantId: c.id, name: c.name, bib: c.bib_number,
      marks, judgeTotals, roundTotals, total, maxTotal, reached,
    }
  })

  const ranked = rows.filter((r) => r.reached > 0)
  ranked.sort((a, b) =>
    b.reached - a.reached || b.total - a.total || compareBib(a.bib, b.bib))

  return { rounds, judges, rows: ranked, submittedBy }
}
