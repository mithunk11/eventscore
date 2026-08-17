import type { SupabaseClient } from '@supabase/supabase-js'
import { roundStandings } from '@/lib/scoring'

export type RoundColumn = { id: string; name: string; position: number }

export type FullRow = {
  contestantId: string
  name: string
  bib: string | null
  photo: string | null
  perRound: Record<string, number | null>
  reached: number
  grandTotal: number
}

/**
 * Every contestant, ranked. Rounds stay separate: a round score is never mixed
 * into another. Ranking is by how far someone got, then by how they did in that
 * furthest round — which is how a competition is actually decided.
 * Grand total is shown alongside as a record, not as the ranking key.
 */
export async function fullResults(db: SupabaseClient, eventId: string) {
  const { data: rounds } = await db
    .from('rounds').select('id, name, position').eq('event_id', eventId).order('position')

  const columns: RoundColumn[] = (rounds ?? []).map((r) => ({
    id: r.id, name: r.name, position: r.position,
  }))

  const { data: contestants } = await db
    .from('contestants').select('id, name, bib_number, photo_url')
    .eq('event_id', eventId).eq('status', 'active')

  const rows = new Map<string, FullRow>()
  for (const c of contestants ?? []) {
    rows.set(c.id, {
      contestantId: c.id, name: c.name, bib: c.bib_number, photo: c.photo_url,
      perRound: {}, reached: 0, grandTotal: 0,
    })
  }

  for (const col of columns) {
    const standings = await roundStandings(db, col.id)
    for (const s of standings) {
      const row = rows.get(s.contestantId)
      if (!row) continue
      row.perRound[col.id] = s.judgesIn > 0 ? s.score : null
      if (s.judgesIn > 0) {
        row.reached = col.position
        row.grandTotal += s.score
      }
    }
  }

  const list = Array.from(rows.values()).filter((r) => r.reached > 0)

  list.sort((a, b) => {
    if (b.reached !== a.reached) return b.reached - a.reached
    const aLast = a.perRound[columns[a.reached - 1]?.id] ?? 0
    const bLast = b.perRound[columns[b.reached - 1]?.id] ?? 0
    if (bLast !== aLast) return bLast - aLast
    return Number(a.bib ?? 0) - Number(b.bib ?? 0)
  })

  return { columns, rows: list }
}
