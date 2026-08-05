'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function sendEnquiry(_prev: unknown, form: FormData) {
  // Honeypot: a real person never fills a hidden field
  if (String(form.get('website') ?? '')) return { ok: true }

  const name = String(form.get('name') ?? '').trim()
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const organisation = String(form.get('organisation') ?? '').trim()
  const message = String(form.get('message') ?? '').trim()

  if (!name || !email.includes('@') || message.length < 10) {
    return { error: 'Please add your name, a valid email, and a little more detail.' }
  }
  if (message.length > 4000) return { error: 'That message is too long.' }

  const db = createAdminClient()

  // Light throttle: five from one address per hour
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
  const { count } = await db
    .from('enquiries').select('id', { count: 'exact', head: true })
    .eq('email', email).gte('created_at', hourAgo)
  if ((count ?? 0) >= 5) return { error: 'That is a lot of messages. Try again later.' }

  const { error } = await db.from('enquiries').insert({
    name, email, organisation: organisation || null, message,
  })
  if (error) return { error: 'Something went wrong sending that. Try again.' }

  return { ok: true }
}
