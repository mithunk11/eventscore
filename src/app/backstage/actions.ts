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
  revalidatePath('/backstage')
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
  revalidatePath('/backstage')
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
  revalidatePath('/backstage')
  return { ok: true }
}

export async function restore(profileId: string) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  // Supabase leaves the email unconfirmed after some admin changes, which
  // blocks sign-in with a confusing message. Re-confirm on the way back in.
  const { createAdminClient } = await import('@/lib/supabase/admin')
  await createAdminClient().auth.admin.updateUserById(profileId, { email_confirm: true })

  const { error } = await supabase.from('profiles')
    .update({ status: 'active', access: 'full', deleted_at: null })
    .eq('id', profileId)

  if (error) return { error: error.message }
  revalidatePath('/backstage')
  return { ok: true }
}

/**
 * Creates a customer account outright, so the owner never has to open the
 * Supabase dashboard. A temporary password is generated and shown once; the
 * owner passes it to the customer however they like, and the customer changes
 * it on first sign-in.
 */
export async function createCustomer(_prev: unknown, form: FormData) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const orgName = String(form.get('org_name') ?? '').trim()
  if (!email || !email.includes('@')) return { error: 'Enter a valid email address.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const db = createAdminClient()

  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  const tempPassword = Array.from(bytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14)

  const { data: created, error: authError } = await db.auth.admin.createUser({
    email, password: tempPassword, email_confirm: true,
  })

  if (authError) {
    return { error: authError.message.includes('already') ? 'That email already has an account.' : authError.message }
  }
  if (!created?.user) return { error: 'Could not create the account.' }

  await db.from('profiles').upsert({
    id: created.user.id, email, org_name: orgName || null,
    role: String(form.get('role') ?? 'customer') === 'owner' ? 'owner' : 'customer',
    access: 'full', status: 'active',
    max_active_events: Number(form.get('events') ?? 1),
    max_contestants: Number(form.get('contestants') ?? 30),
    max_judges: Number(form.get('judges') ?? 5),
  })

  revalidatePath('/backstage')
  return { ok: true, email, tempPassword }
}

/** Issues a fresh temporary password when a customer is locked out. */
export async function resetCustomerPassword(profileId: string) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const db = createAdminClient()

  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  const tempPassword = Array.from(bytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14)

  const { error } = await db.auth.admin.updateUserById(profileId, { password: tempPassword })
  if (error) return { error: error.message }

  return { ok: true, tempPassword }
}

/**
 * Clears a customer's two-factor setup when they lose their phone.
 * TOTP has no self-service recovery, so this is the only way back in.
 */
export async function clearTwoFactor(profileId: string) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const db = createAdminClient()

  const { data: list, error: listError } = await db.auth.admin.mfa.listFactors({ userId: profileId })
  if (listError) return { error: listError.message }

  let cleared = 0
  for (const f of list?.factors ?? []) {
    const { error } = await db.auth.admin.mfa.deleteFactor({ id: f.id, userId: profileId })
    if (!error) cleared++
  }

  await db.from('audit_log').insert({
    actor_id: profileId, action: 'mfa.cleared_by_owner', target_type: 'profile', target_id: profileId,
  })

  revalidatePath('/backstage')
  return { ok: true, cleared }
}

function tempPassword() {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14)
}

/** Changes email and organisation. Email changes go through Supabase Auth too. */
export async function updateAccountDetails(profileId: string, form: FormData) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const orgName = String(form.get('org_name') ?? '').trim()
  if (!email.includes('@')) return { error: 'Enter a valid email address.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const db = createAdminClient()

  const { error: authError } = await db.auth.admin.updateUserById(profileId, { email, email_confirm: true })
  if (authError) return { error: authError.message }

  const { error } = await db.from('profiles').update({ email, org_name: orgName || null }).eq('id', profileId)
  if (error) return { error: error.message }

  revalidatePath('/backstage')
  return { ok: true }
}

/**
 * Promotes or demotes an account. An owner can manage every account, so this is
 * the most consequential control here — the last owner cannot be demoted.
 */
export async function setRole(profileId: string, role: 'owner' | 'customer') {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  if (role === 'customer') {
    const { count } = await supabase
      .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner')
    if ((count ?? 0) <= 1) return { error: 'This is the only owner. Promote someone else first.' }
  }

  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId)
  if (error) return { error: error.message }

  revalidatePath('/backstage')
  return { ok: true }
}

/** Issues a fresh password when someone is locked out. Shown once. */
export async function resetPassword(profileId: string) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const db = createAdminClient()

  const password = tempPassword()
  const { error } = await db.auth.admin.updateUserById(profileId, { password })
  if (error) return { error: error.message }

  await db.from('audit_log').insert({
    actor_id: profileId, action: 'password.reset_by_owner', target_type: 'profile', target_id: profileId,
  })

  return { ok: true, password }
}

/**
 * Removes an account outright: the sign-in record, the profile, every event
 * they created and all the photographs belonging to those events.
 *
 * Irreversible, and the only way to free an email address for reuse. Soft
 * delete leaves the auth record in place, so creating the same email again
 * fails until this has run.
 */
export async function purgeAccount(profileId: string, typedEmail: string) {
  const supabase = await requireOwner()
  if (!supabase) return { error: 'Not permitted.' }

  const { data: me } = await supabase.auth.getUser()
  if (me?.user?.id === profileId) {
    return { error: 'You cannot purge your own account.' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles').select('id, email, role, status').eq('id', profileId).maybeSingle()
  if (!profile) return { error: 'That account no longer exists.' }

  if (typedEmail.trim().toLowerCase() !== (profile.email ?? '').toLowerCase()) {
    return { error: 'The email did not match, so nothing was deleted.' }
  }

  if (profile.role === 'owner') {
    const { count } = await db
      .from('profiles').select('id', { count: 'exact', head: true })
      .eq('role', 'owner').neq('status', 'deleted')
    if ((count ?? 0) <= 1) return { error: 'This is the only owner. Promote someone else first.' }
  }

  // Photographs are not removed by any database cascade, so they go first.
  const { data: events } = await db.from('events').select('id').eq('owner_id', profileId)
  const { deleteEventMedia } = await import('@/lib/purge')

  let photosRemoved = 0
  for (const e of events ?? []) {
    photosRemoved += await deleteEventMedia(db, profileId, e.id)
  }

  // Events cascade to rounds, categories, contestants, judges and scores.
  await db.from('events').delete().eq('owner_id', profileId)
  await db.from('acceptances').delete().eq('profile_id', profileId)
  await db.from('recovery_codes').delete().eq('profile_id', profileId)
  await db.from('profiles').delete().eq('id', profileId)

  // Last, so a failure above leaves the account recoverable rather than orphaned.
  const { error: authError } = await db.auth.admin.deleteUser(profileId)
  if (authError) {
    return { error: 'Data removed, but the sign-in record could not be deleted: ' + authError.message }
  }

  await db.from('audit_log').insert({
    actor_id: me?.user?.id ?? null,
    action: 'account.purged',
    target_type: 'profile',
    target_id: profileId,
    detail: { email: profile.email, events: events?.length ?? 0, photos: photosRemoved },
  })

  revalidatePath('/backstage')
  return { ok: true, email: profile.email }
}
