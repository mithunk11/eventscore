import type { SupabaseClient } from '@supabase/supabase-js'

const WINDOW_MINUTES = 15
const MAX_FAILURES = 8

/**
 * A four digit PIN has 10,000 combinations, which a script works through in
 * seconds. This caps failed attempts per invite link or event code.
 */
export async function tooManyAttempts(db: SupabaseClient, identifier: string) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()
  const { count } = await db
    .from('signin_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('ok', false)
    .gte('created_at', since)
  return (count ?? 0) >= MAX_FAILURES
}

export async function recordAttempt(db: SupabaseClient, identifier: string, ok: boolean) {
  await db.from('signin_attempts').insert({ identifier, ok })
}

export const LOCKOUT_MESSAGE =
  'Too many attempts. Wait 15 minutes, or ask the organiser to check your PIN.'
