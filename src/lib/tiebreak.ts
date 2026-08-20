import type { SupabaseClient } from '@supabase/supabase-js'
import { roundStandings, type Standing } from '@/lib/scoring'

export type OpenBallot = {
  id: string
  place: number
  roundId: string
  tied: Standing[]
  votes: { judgeId: string; chosenEntryId: string }[]
  judgeCount: number
}

/**
 * A tie only matters if it sits at a place that changes the outcome:
 * inside the winners on a final round, or on the advance line otherwise.
 * A tie for 6th when three are awarded is left alone.
 */
function tiesThatMatter(standings: Standing[], cutoff: number) {
  const groups: { place: number; entries: Standing[] }[] = []
  let i = 0
  while (i < standings.length) {
    const same = [standings[i]]
    let j = i + 1
    while (j < standings.length && Math.abs(standings[j].marks - standings[i].marks) < 0.001) {
      same.push(standings[j])
      j++
    }
    // Only if this group straddles or sits above the cutoff
    if (same.length > 1 && i < cutoff) {
      groups.push({ place: i + 1, entries: same })
    }
    i = j
  }
  return groups
}

/**
 * Opens a ballot if the round needs one. Called once every judge has submitted.
 * Ballots run one at a time, highest place first.
 */
export async function ensureBallot(db: SupabaseClient, roundId: string, winnersCount: number) {
  const { data: round } = await db
    .from('rounds').select('id, event_id, advance_count').eq('id', roundId).maybeSingle()
  if (!round) return null

  // Already one open? Leave it.
  const { data: existing } = await db
    .from('tiebreaks').select('*').eq('round_id', roundId).eq('status', 'open').maybeSingle()
  if (existing) return existing

  const standings = await roundStandings(db, roundId)
  if (standings.length === 0) return null

  const cutoff = round.advance_count ?? winnersCount
  const groups = tiesThatMatter(standings, cutoff)
  if (groups.length === 0) return null

  // Skip any place already settled
  const { data: done } = await db
    .from('tiebreaks').select('place').eq('round_id', roundId).neq('status', 'open')
  const settled = new Set((done ?? []).map((d) => d.place))

  const next = groups.find((g) => !settled.has(g.place))
  if (!next) return null

  const { data: created } = await db.from('tiebreaks').insert({
    round_id: roundId,
    place: next.place,
    method: 'judge_vote',
    status: 'open',
    tied_entry_ids: next.entries.map((e) => e.entryId),
  }).select('*').single()

  return created
}

/**
 * Counts the votes.
 *  - one judge decides alone
 *  - a two-judge split goes to the head judge
 *  - otherwise majority, and a tied majority goes to the head judge
 * Head judge is whoever is first in the judges order.
 */
export async function resolveBallot(db: SupabaseClient, ballotId: string) {
  const { data: ballot } = await db.from('tiebreaks').select('*').eq('id', ballotId).maybeSingle()
  if (!ballot || ballot.status !== 'open') return null

  const { data: round } = await db
    .from('rounds').select('event_id').eq('id', ballot.round_id).maybeSingle()
  if (!round) return null

  const { data: judges } = await db
    .from('judges').select('id, name, position')
    .eq('event_id', round.event_id).eq('status', 'active').order('position')

  const judgeIds = (judges ?? []).map((j) => j.id)
  const headJudge = judges?.[0]

  const { data: votes } = await db
    .from('judge_votes').select('judge_id, chosen_entry_id').eq('tiebreak_id', ballotId)

  // Everyone must vote before it resolves
  if ((votes ?? []).length < judgeIds.length) return null

  const tally = new Map<string, number>()
  for (const v of votes ?? []) {
    tally.set(v.chosen_entry_id, (tally.get(v.chosen_entry_id) ?? 0) + 1)
  }

  const ranked = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])
  const clearWinner = ranked.length === 1 || (ranked[0] && ranked[1] && ranked[0][1] > ranked[1][1])

  let winnerEntryId: string
  let note: string

  if (clearWinner) {
    winnerEntryId = ranked[0][0]
    note = judgeIds.length === 1
      ? 'Decided by the judge'
      : 'Panel ballot, ' + ranked[0][1] + ' of ' + judgeIds.length
  } else {
    const headVote = (votes ?? []).find((v) => v.judge_id === headJudge?.id)
    if (!headVote) return null
    winnerEntryId = headVote.chosen_entry_id
    note = 'Panel split, decided by head judge' + (headJudge?.name ? ' (' + headJudge.name + ')' : '')
  }

  await db.from('tiebreaks').update({
    status: 'resolved',
    winner_entry_id: winnerEntryId,
    note,
    resolved_at: new Date().toISOString(),
  }).eq('id', ballotId)

  return { winnerEntryId, note }
}

/**
 * Applies resolved ballots to a set of standings so the order reflects them.
 */
export async function applyBallots(db: SupabaseClient, roundId: string, standings: Standing[]) {
  const { data: resolved } = await db
    .from('tiebreaks').select('place, winner_entry_id, note')
    .eq('round_id', roundId).eq('status', 'resolved').order('place')

  if (!resolved?.length) return { standings, notes: [] as { place: number; note: string }[] }

  const out = [...standings]
  for (const t of resolved) {
    if (!t.winner_entry_id) continue
    const idx = out.findIndex((s) => s.entryId === t.winner_entry_id)
    const target = t.place - 1
    if (idx < 0 || idx === target) continue
    const [moved] = out.splice(idx, 1)
    out.splice(target, 0, moved)
  }

  return {
    standings: out,
    notes: resolved.map((t) => ({ place: t.place, note: t.note ?? '' })),
  }
}
