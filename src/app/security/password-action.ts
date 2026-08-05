'use server'

import { createClient } from '@/lib/supabase/server'

export async function changeOwnPassword(_prev: unknown, form: FormData) {
  const current = String(form.get('current') ?? '')
  const next = String(form.get('next') ?? '')
  const again = String(form.get('again') ?? '')

  if (next.length < 10) return { error: 'Use at least 10 characters.' }
  if (next !== again) return { error: 'The two new passwords do not match.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not signed in.' }

  // Re-check the old password, so a borrowed session cannot change it
  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: user.email, password: current,
  })
  if (checkError) return { error: 'Your current password is not right.' }

  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) return { error: error.message }

  return { ok: true }
}
