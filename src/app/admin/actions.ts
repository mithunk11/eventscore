'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * These only ever touch the profiles table. There is deliberately no policy
 * anywhere granting an owner access to events, contestants or scores, so the
 * database itself refuses those reads even if this code asked for them.
 */
async function requireOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'owner') return null
  return supabase
}

export async function setAccess(profileId: string, access: 'full' | 'readonly' | 'disabled') {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const { error } = await supabase.from('profiles').update({ access }).eq('id', profileId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

export async function setLimits(profileId: string, form: FormData) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const { error } = await supabase.from('profiles').update({
    max_active_events: Number(form.get('events') ?? 1),
    max_contestants: Number(form.get('contestants') ?? 30),
    max_judges: Number(form.get('judges') ?? 5),
  }).eq('id', profileId)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

/** Soft delete. The 30 day grace period exists because you will click this by mistake. */
export async function softDelete(profileId: string) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const { error } = await supabase.from('profiles')
    .update({ status: 'deleted', access: 'disabled', deleted_at: new Date().toISOString() })
    .eq('id', profileId)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

export async function restore(profileId: string) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const { error } = await supabase.from('profiles')
    .update({ status: 'active', access: 'full', deleted_at: null })
    .eq('id', profileId)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}
