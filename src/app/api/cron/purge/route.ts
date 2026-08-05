import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { purgeExpiredEvents } from '@/lib/purge'

/**
 * Deletes events past their retention window, photos included.
 * Call on a schedule with:
 *   Authorization: Bearer <CRON_SECRET>
 * Also keeps the Supabase project awake, which the free tier needs.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 })

  if (request.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const db = createAdminClient()
  const removed = await purgeExpiredEvents(db)

  return NextResponse.json({ ok: true, eventsRemoved: removed, at: new Date().toISOString() })
}
