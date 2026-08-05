import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Removes every photo belonging to one event.
 * Paths are laid out as {ownerId}/{eventId}/{file}, so one folder holds
 * everything for an event and nothing else.
 */
export async function deleteEventMedia(db: SupabaseClient, ownerId: string, eventId: string) {
  const folder = ownerId + '/' + eventId

  const { data: files, error } = await db.storage.from('event-media').list(folder, { limit: 1000 })
  if (error || !files || files.length === 0) return 0

  const paths = files.map((f) => folder + '/' + f.name)
  const { error: rmError } = await db.storage.from('event-media').remove(paths)
  if (rmError) return 0

  return paths.length
}

/**
 * Deletes an event, its photos, and everything hanging off it.
 * Database rows cascade from the events row; photos have to be removed by hand,
 * and are removed FIRST so a failure part-way through leaves the event visible
 * rather than leaving orphaned images nobody can find.
 */
export async function deleteEventCompletely(db: SupabaseClient, ownerId: string, eventId: string) {
  const photos = await deleteEventMedia(db, ownerId, eventId)
  const { error } = await db.from('events').delete().eq('id', eventId)
  if (error) return { error: error.message }
  return { ok: true, photos }
}

/** Events past their retention window. Run on a schedule. */
export async function purgeExpiredEvents(db: SupabaseClient) {
  const { data: events } = await db
    .from('events').select('id, owner_id, event_date, retention_days')
    .not('event_date', 'is', null)

  let removed = 0
  for (const e of events ?? []) {
    const keepDays = Number(e.retention_days ?? 90)
    const expiry = new Date(e.event_date)
    expiry.setDate(expiry.getDate() + keepDays)
    if (expiry > new Date()) continue

    await deleteEventCompletely(db, e.owner_id, e.id)
    removed++
  }
  return removed
}
