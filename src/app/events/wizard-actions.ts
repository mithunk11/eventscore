'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function owned(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('events').select('id').eq('id', eventId).eq('owner_id', user.id).maybeSingle()
  return data ? supabase : null
}

export async function saveBasics(eventId: string, form: FormData) {
  const supabase = await owned(eventId)
  if (!supabase) return { error: 'Not permitted.' }

  const name = String(form.get('name') ?? '').trim()
  if (!name) return { error: 'Give the event a name.' }

  const { error } = await supabase.from('events').update({
    name,
    event_date: String(form.get('event_date') ?? '') || null,
    venue: String(form.get('venue') ?? '').trim() || null,
    winners_count: Number(form.get('winners_count') ?? 3) || 3,
  }).eq('id', eventId)

  if (error) return { error: error.message }
  revalidatePath('/events/' + eventId)
  return { ok: true }
}

export async function addRound(eventId: string, form: FormData) {
  const supabase = await owned(eventId)
  if (!supabase) return { error: 'Not permitted.' }

  const name = String(form.get('name') ?? '').trim()
  const isFinal = form.get('is_final') === 'yes'
  const advance = form.get('advance')

  if (!name) return { error: 'Give the round a name.' }
  if (!isFinal && !advance) return { error: 'Say how many go through, or mark this as the final.' }

  const { count } = await supabase
    .from('rounds').select('id', { count: 'exact', head: true }).eq('event_id', eventId)

  const { error } = await supabase.from('rounds').insert({
    event_id: eventId,
    position: (count ?? 0) + 1,
    name,
    advance_count: isFinal ? null : Number(advance),
  })

  if (error) return { error: error.message }
  revalidatePath('/events/' + eventId + '/setup')
  return { ok: true }
}

export async function addCategory(eventId: string, roundId: string, form: FormData) {
  const supabase = await owned(eventId)
  if (!supabase) return { error: 'Not permitted.' }

  const name = String(form.get('name') ?? '').trim()
  const max = Number(form.get('max_score') ?? 0)
  if (!name) return { error: 'Give the category a name.' }
  if (!max || max < 1) return { error: 'The highest mark must be at least 1.' }

  const { count } = await supabase
    .from('categories').select('id', { count: 'exact', head: true }).eq('round_id', roundId)

  const { error } = await supabase.from('categories').insert({
    round_id: roundId,
    position: (count ?? 0) + 1,
    name,
    max_score: max,
    weight: 1,
  })

  if (error) return { error: error.message }
  revalidatePath('/events/' + eventId + '/setup')
  return { ok: true }
}

export async function saveSettings(eventId: string, form: FormData) {
  const supabase = await owned(eventId)
  if (!supabase) return { error: 'Not permitted.' }

  const { error } = await supabase.from('events').update({
    comments_mode: String(form.get('comments_mode') ?? 'optional'),
    show_scores: form.get('show_scores') === 'on',
    retention_days: Number(form.get('retention_days') ?? 90) || 90,
  }).eq('id', eventId)

  if (error) return { error: error.message }
  revalidatePath('/events/' + eventId)
  return { ok: true }
}

export async function removeItem(eventId: string, table: string, itemId: string) {
  const supabase = await owned(eventId)
  if (!supabase) return { error: 'Not permitted.' }
  if (!['rounds', 'categories', 'contestants', 'judges'].includes(table)) {
    return { error: 'Not allowed.' }
  }

  const { error } = await supabase.from(table).delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath('/events/' + eventId + '/setup')
  return { ok: true }
}
