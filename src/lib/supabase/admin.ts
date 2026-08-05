import { createClient } from '@supabase/supabase-js'

/**
 * SERVER ONLY. This client bypasses every Row Level Security rule.
 * Never import it into a file that runs in the browser.
 * Judges have no Supabase account, so their requests are served here after
 * their session token has been validated.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
