import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const JUDGE_COOKIE = 'es_judge'

export async function getJudgeSession() {
  const jar = await cookies()
  const token = jar.get(JUDGE_COOKIE)?.value
  if (!token) return null

  const db = createAdminClient()
  const { data: session } = await db
    .from('judge_sessions').select('*').eq('token', token).maybeSingle()

  if (!session || new Date(session.expires_at) < new Date()) return null

  const { data: judge } = await db.from('judges').select('*').eq('id', session.judge_id).maybeSingle()
  if (!judge || judge.status !== 'active') return null

  const { data: event } = await db.from('events').select('*').eq('id', session.event_id).maybeSingle()
  if (!event) return null

  return { judge, event, db }
}
