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

/**
 * Settles an open ballot by entry number instead of waiting for judges.
 * For when someone has left the venue. Recorded like any other outcome.
 */
export async function skipBallot(eventId: string, ballotId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { data: ballot } = await supabase
    .from('tiebreaks').select('id, round_id, tied_entry_ids').eq('id', ballotId).maybeSingle()
  if (!ballot) return { error: 'That vote no longer exists.' }

  const { data: entries } = await supabase
    .from('entries').select('id, contestants(bib_number)')
    .in('id', ballot.tied_entry_ids ?? [])

  const sorted = (entries ?? []).sort((a, b) => {
    const ab = Number((a.contestants as unknown as { bib_number: string | null })?.bib_number ?? 0)
    const bb = Number((b.contestants as unknown as { bib_number: string | null })?.bib_number ?? 0)
    return ab - bb
  })

  const { error } = await supabase.from('tiebreaks').update({
    status: 'resolved',
    method: 'manual',
    winner_entry_id: sorted[0]?.id ?? null,
    note: 'Settled by the organiser, ordered by entry number',
    resolved_at: new Date().toISOString(),
  }).eq('id', ballotId)

  if (error) return { error: error.message }
  revalidatePath('/events/' + eventId + '/live')
  return { ok: true }
}

/** True once any judge has entered a mark for this round. */
async function roundHasScores(supabase: Awaited<ReturnType<typeof createClient>>, roundId: string) {
  const { data: entries } = await supabase.from('entries').select('id').eq('round_id', roundId)
  if (!entries?.length) return false
  const { count } = await supabase
    .from('scores').select('id', { count: 'exact', head: true })
    .in('entry_id', entries.map((e) => e.id))
  return (count ?? 0) > 0
}

export async function updateRound(eventId: string, roundId: string, form: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  if (await roundHasScores(supabase, roundId)) {
    return { error: 'Judges have started scoring this round, so it can no longer be changed.' }
  }

  const name = String(form.get('name') ?? '').trim()
  const isFinal = form.get('is_final') === 'yes'
  const advance = form.get('advance')

  if (!name) return { error: 'Give the round a name.' }
  if (!isFinal && !advance) return { error: 'Say how many go through, or mark this as the final.' }

  const { error } = await supabase.from('rounds').update({
    name,
    advance_count: isFinal ? null : Number(advance),
  }).eq('id', roundId)

  if (error) return { error: error.message }
  revalidatePath('/events/' + eventId)
  revalidatePath('/events/' + eventId + '/rounds/' + roundId)
  return { ok: true }
}

/**
 * Deletes a round outright. Its categories, entries and any marks go with it,
 * and the rounds after it move up to close the gap.
 */
export async function deleteRound(eventId: string, roundId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  if (await roundHasScores(supabase, roundId)) {
    return { error: 'Judges have scored this round, so it cannot be deleted.' }
  }

  const { data: round } = await supabase
    .from('rounds').select('position, event_id').eq('id', roundId).maybeSingle()
  if (!round || round.event_id !== eventId) return { error: 'Round not found.' }

  const { error } = await supabase.from('rounds').delete().eq('id', roundId)
  if (error) return { error: error.message }

  // Close the gap so the numbering stays 1, 2, 3
  const { data: rest } = await supabase
    .from('rounds').select('id, position').eq('event_id', eventId).order('position')
  for (let i = 0; i < (rest ?? []).length; i++) {
    if (rest![i].position !== i + 1) {
      await supabase.from('rounds').update({ position: i + 1 }).eq('id', rest![i].id)
    }
  }

  revalidatePath('/events/' + eventId)
  redirect('/events/' + eventId)
}

export async function updateCategory(eventId: string, roundId: string, categoryId: string, form: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  if (await roundHasScores(supabase, roundId)) {
    return { error: 'Judges have started scoring, so the marks cannot be changed now.' }
  }

  const name = String(form.get('name') ?? '').trim()
  const max = Number(form.get('max_score') ?? 0)
  if (!name) return { error: 'Give the category a name.' }
  if (!max || max < 1) return { error: 'The highest mark must be at least 1.' }

  const { error } = await supabase.from('categories')
    .update({ name, max_score: max }).eq('id', categoryId)

  if (error) return { error: error.message }
  revalidatePath('/events/' + eventId + '/rounds/' + roundId)
  return { ok: true }
}
