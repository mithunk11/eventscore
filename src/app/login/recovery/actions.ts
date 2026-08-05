'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashCode } from '@/lib/recovery'

/**
 * The way back in when the authenticator is gone.
 * A valid code clears the account's two-factor setup, so the password alone
 * gets them in and they can enrol a new device. The code is then spent.
 */
export async function signInWithRecoveryCode(_prev: unknown, form: FormData) {
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  const code = String(form.get('code') ?? '').trim()

  if (!email || !password || !code) return { error: 'Fill in all three fields.' }

  const supabase = await createClient()
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.user) return { error: 'Email or password is not right.' }

  const db = createAdminClient()
  const { data: match } = await db
    .from('recovery_codes').select('id')
    .eq('profile_id', signIn.user.id)
    .eq('code_hash', hashCode(code))
    .is('used_at', null)
    .maybeSingle()

  if (!match) {
    await supabase.auth.signOut()
    return { error: 'That recovery code is not valid, or has already been used.' }
  }

  await db.from('recovery_codes').update({ used_at: new Date().toISOString() }).eq('id', match.id)

  const { data: factors } = await db.auth.admin.mfa.listFactors({ userId: signIn.user.id })
  for (const f of factors?.factors ?? []) {
    await db.auth.admin.mfa.deleteFactor({ id: f.id, userId: signIn.user.id })
  }

  await db.from('audit_log').insert({
    actor_id: signIn.user.id, action: 'mfa.recovery_code_used',
    target_type: 'profile', target_id: signIn.user.id,
  })

  redirect('/security?recovered=1')
}
