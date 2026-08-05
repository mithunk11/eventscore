'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureRoster } from '@/lib/scoring'

/** Moves a judge to the top of the order, which makes them head judge. */
export async function makeHeadJudge(eventId: string, judgeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { data: event } = await supabase.from('events').select('id').eq('id', eventId).maybeSingle()
  if (!event) return { error: 'Event not found.' }

  const { data: judges } = await supabase
    .from('judges').select('id, position').eq('event_id', eventId).order('position')
  if (!judges) return { error: 'No judges.' }

  const reordered = [judges.find((j) => j.id === judgeId), ...judges.filter((j) => j.id !== judgeId)]
    .filter(Boolean) as { id: string }[]

  for (let i = 0; i < reordered.length; i++) {
    await supabase.from('judges').update({ position: i + 1 }).eq('id', reordered[i].id)
  }

  revalidatePath('/events/' + eventId + '/judges')
  return { ok: true }
}

/** Swaps a judge with the one above or below them. */
export async function moveJudge(eventId: string, judgeId: string, direction: 'up' | 'down') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { data: judges } = await supabase
    .from('judges').select('id, position').eq('event_id', eventId).order('position')
  if (!judges) return { error: 'No judges.' }

  const i = judges.findIndex((j) => j.id === judgeId)
  const j = direction === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= judges.length) return { ok: true }

  await supabase.from('judges').update({ position: judges[j].position }).eq('id', judges[i].id)
  await supabase.from('judges').update({ position: judges[i].position }).eq('id', judges[j].id)

  revalidatePath('/events/' + eventId + '/judges')
  return { ok: true }
}

/**
 * Closes a round without every judge having submitted.
 * The escape hatch for a judge whose phone died mid-event. Scores already entered
 * still count; the missing judge simply does not contribute.
 */
export async function forceCloseRound(eventId: string, roundId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { data: round } = await supabase
    .from('rounds').select('id, event_id, position').eq('id', roundId).maybeSingle()
  if (!round || round.event_id !== eventId) return { error: 'Round not found.' }

  await supabase.from('rounds').update({ force_closed: true }).eq('id', roundId)

  const db = createAdminClient()
  const { data: next } = await db
    .from('rounds').select('id').eq('event_id', eventId).eq('position', round.position + 1).maybeSingle()
  if (next) await ensureRoster(db, next.id)

  revalidatePath('/events/' + eventId + '/live')
  return { ok: true }
}

export async function reopenRound(eventId: string, roundId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  await supabase.from('rounds').update({ force_closed: false }).eq('id', roundId)
  revalidatePath('/events/' + eventId + '/live')
  return { ok: true }
}

export async function updateEventSettings(eventId: string, form: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { error } = await supabase.from('events').update({
    comments_mode: String(form.get('comments_mode') ?? 'optional'),
    progression: String(form.get('progression') ?? 'synchronised'),
    show_scores: form.get('show_scores') === 'on',
    winners_count: Number(form.get('winners_count') ?? 3),
    retention_days: Number(form.get('retention_days') ?? 90),
  }).eq('id', eventId).eq('owner_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/events/' + eventId + '/settings')
  return { ok: true }
}

/**
 * Permanent. Photos go first, then the event row, which cascades to rounds,
 * contestants, judges, scores and comments.
 */
export async function deleteEvent(eventId: string, typedName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { data: event } = await supabase
    .from('events').select('id, name, owner_id').eq('id', eventId).maybeSingle()
  if (!event || event.owner_id !== user.id) return { error: 'Event not found.' }

  if (typedName.trim() !== event.name.trim()) {
    return { error: 'The name did not match, so nothing was deleted.' }
  }

  const { deleteEventCompletely } = await import('@/lib/purge')
  const db = createAdminClient()
  const result = await deleteEventCompletely(db, event.owner_id, eventId)
  if ('error' in result && result.error) return { error: result.error }

  await db.from('audit_log').insert({
    actor_id: user.id, action: 'event.deleted', target_type: 'event', target_id: eventId,
    detail: { name: event.name, photos_removed: 'photos' in result ? result.photos : 0 },
  })

  redirect('/dashboard')
}
