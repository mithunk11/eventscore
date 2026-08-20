import type { SupabaseClient } from '@supabase/supabase-js'
import { roundStandings } from '@/lib/scoring'

export type RoundColumn = { id: string; name: string; position: number; maxMarks: number }

export type FullRow = {
  contestantId: string
  name: string
  bib: string | null
  photo: string | null
  perRound: Record<string, number | null>
  reached: number
  total: number          // marks added across every round they took part in
  maxTotal: number       // the most those rounds could have given them
}

/**
 * Everyone, ranked by total marks across every round they took part in.
 * No percentages: the number shown is the number the judges gave.
 */
export async function fullResults(db: SupabaseClient, eventId: string) {
  const { data: rounds } = await db
    .from('rounds').select('id, name, position').eq('event_id', eventId).order('position')

  const { data: contestants } = await db
    .from('contestants').select('id, name, bib_number, photo_url')
    .eq('event_id', eventId).eq('status', 'active')

  const columns: RoundColumn[] = []
  const rows = new Map<string, FullRow>()

  for (const c of contestants ?? []) {
    rows.set(c.id, {
      contestantId: c.id, name: c.name, bib: c.bib_number, photo: c.photo_url,
      perRound: {}, reached: 0, total: 0, maxTotal: 0,
    })
  }

  for (const r of rounds ?? []) {
    const standings = await roundStandings(db, r.id)
    const maxMarks = standings[0]?.maxMarks ?? 0
    columns.push({ id: r.id, name: r.name, position: r.position, maxMarks })

    for (const s of standings) {
      const row = rows.get(s.contestantId)
      if (!row) continue
      if (s.judgesIn > 0) {
        row.perRound[r.id] = s.marks
        row.reached = r.position
        row.total += s.marks
        row.maxTotal += maxMarks
      } else {
        row.perRound[r.id] = null
      }
    }
  }

  const list = Array.from(rows.values()).filter((r) => r.reached > 0)

  // Highest total wins. Going further naturally earns more marks, so the
  // ordering follows how far somebody got without needing a separate rule.
  list.sort((a, b) => b.total - a.total || Number(a.bib ?? 0) - Number(b.bib ?? 0))

  return { columns, rows: list }
}
