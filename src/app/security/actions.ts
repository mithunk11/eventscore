'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCodes, hashCode } from '@/lib/recovery'

export async function saveBackupEmail(_prev: unknown, form: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const backup = String(form.get('backup_email') ?? '').trim().toLowerCase()
  if (backup && !backup.includes('@')) return { error: 'That does not look like an email address.' }
  if (backup && backup === user.email?.toLowerCase()) {
    return { error: 'Use a different address from your sign-in email, or it is no help if you lose access.' }
  }

  const { error } = await supabase.from('profiles')
    .update({ backup_email: backup || null }).eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/security')
  return { ok: true }
}

/** Replaces any existing codes. Shown once, stored only as hashes. */
export async function regenerateRecoveryCodes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const db = createAdminClient()
  await db.from('recovery_codes').delete().eq('profile_id', user.id)

  const codes = generateCodes()
  const { error } = await db.from('recovery_codes').insert(
    codes.map((c) => ({ profile_id: user.id, code_hash: hashCode(c) }))
  )
  if (error) return { error: error.message }

  revalidatePath('/security')
  return { ok: true, codes }
}
