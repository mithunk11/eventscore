'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getJudgeSession, JUDGE_COOKIE } from '@/lib/judge-session'
import { ensureRoster } from '@/lib/scoring'
import { tooManyAttempts, recordAttempt, LOCKOUT_MESSAGE } from '@/lib/ratelimit'

async function startSession(judgeId: string, eventId: string) {
  const db = createAdminClient()
  const { data: session } = await db
    .from('judge_sessions').insert({ judge_id: judgeId, event_id: eventId })
    .select('token').single()
  if (!session) return false

  const jar = await cookies()
  jar.set(JUDGE_COOKIE, session.token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === 'production',
  })
  return true
}

export async function signInWithToken(_prev: unknown, formData: FormData) {
  const inviteToken = String(formData.get('inviteToken') ?? '')
  const pin = String(formData.get('pin') ?? '').trim()
  if (!pin) return { error: 'Enter your PIN.' }

  const db = createAdminClient()
  if (await tooManyAttempts(db, inviteToken)) return { error: LOCKOUT_MESSAGE }

  const { data: judge } = await db
    .from('judges').select('id, event_id, pin, status')
    .eq('invite_token', inviteToken).maybeSingle()

  if (!judge || judge.status !== 'active') {
    await recordAttempt(db, inviteToken, false)
    return { error: 'This invitation is no longer valid.' }
  }
  if (judge.pin !== pin) {
    await recordAttempt(db, inviteToken, false)
    return { error: 'That PIN is not right. Check with the organiser.' }
  }

  await recordAttempt(db, inviteToken, true)
  if (!(await startSession(judge.id, judge.event_id))) return { error: 'Could not start your session.' }
  redirect('/judge/score')
}

export async function signInJudge(_prev: unknown, formData: FormData) {
  const code = String(formData.get('code') ?? '').trim().toUpperCase()
  const pin = String(formData.get('pin') ?? '').trim()
  if (!code || !pin) return { error: 'Enter the event code and your PIN.' }

  const db = createAdminClient()
  if (await tooManyAttempts(db, code)) return { error: LOCKOUT_MESSAGE }

  const { data: event } = await db.from('events').select('id').eq('code', code).maybeSingle()
  if (!event) {
    await recordAttempt(db, code, false)
    return { error: 'That event code was not recognised.' }
  }

  const { data: judge } = await db
    .from('judges').select('id')
    .eq('event_id', event.id).eq('pin', pin).eq('status', 'active').maybeSingle()
  if (!judge) {
    await recordAttempt(db, code, false)
    return { error: 'That PIN does not match any judge for this event.' }
  }

  await recordAttempt(db, code, true)
  if (!(await startSession(judge.id, event.id))) return { error: 'Could not start your session.' }
  redirect('/judge/score')
}

export async function signOutJudge() {
  const jar = await cookies()
  jar.delete(JUDGE_COOKIE)
  redirect('/judge')
}

export async function saveMark(entryId: string, categoryId: string, value: number | null) {
  const session = await getJudgeSession()
  if (!session) return { error: 'Your session expired.' }
  const { judge, db } = session

  const { data: entry } = await db
    .from('entries').select('id, round_id, rounds(event_id)').eq('id', entryId).maybeSingle()
  if (!entry) return { error: 'Contestant not found.' }
  if ((entry.rounds as unknown as { event_id: string }).event_id !== judge.event_id) return { error: 'Not your event.' }

  const { count } = await db
    .from('submissions').select('judge_id', { count: 'exact', head: true })
    .eq('judge_id', judge.id).eq('round_id', entry.round_id)
  if ((count ?? 0) > 0) return { error: 'You have already submitted this round.' }

  const { error } = await db.from('scores').upsert(
    { judge_id: judge.id, entry_id: entryId, category_id: categoryId, value, updated_at: new Date().toISOString() },
    { onConflict: 'judge_id,entry_id,category_id' }
  )
  if (error) return { error: error.message }
  return { ok: true }
}

export async function saveComment(entryId: string, body: string) {
  const session = await getJudgeSession()
  if (!session) return { error: 'Your session expired.' }
  const { judge, db } = session

  const { error } = await db.from('entry_comments').upsert(
    { judge_id: judge.id, entry_id: entryId, body: body.trim() || null, updated_at: new Date().toISOString() },
    { onConflict: 'judge_id,entry_id' }
  )
  if (error) return { error: error.message }
  return { ok: true }
}

export async function submitRound(roundId: string) {
  const session = await getJudgeSession()
  if (!session) return { error: 'Your session expired.' }
  const { judge, event, db } = session

  const { data: categories } = await db.from('categories').select('id').eq('round_id', roundId)
  const { data: entries } = await db.from('entries').select('id').eq('round_id', roundId)
  if (!categories?.length || !entries?.length) return { error: 'This round is not ready.' }

  const entryIds = entries.map((e) => e.id)

  const { data: mine } = await db
    .from('scores').select('value').eq('judge_id', judge.id).in('entry_id', entryIds)
  const filled = (mine ?? []).filter((s) => s.value !== null).length
  if (filled < entries.length * categories.length) {
    return { error: 'Mark every category for every contestant before submitting.' }
  }

  if (event.comments_mode === 'required') {
    const { data: notes } = await db
      .from('entry_comments').select('body').eq('judge_id', judge.id).in('entry_id', entryIds)
    const written = (notes ?? []).filter((n) => n.body && n.body.trim().length > 0).length
    if (written < entries.length) return { error: 'This event asks for a comment on every contestant.' }
  }

  await db.from('submissions').upsert(
    { judge_id: judge.id, round_id: roundId },
    { onConflict: 'judge_id,round_id' }
  )

  const { data: round } = await db.from('rounds').select('event_id, position').eq('id', roundId).maybeSingle()
  if (round) {
    const { count: judgeCount } = await db
      .from('judges').select('id', { count: 'exact', head: true })
      .eq('event_id', round.event_id).eq('status', 'active')
    const { count: subCount } = await db
      .from('submissions').select('judge_id', { count: 'exact', head: true }).eq('round_id', roundId)

    const everyoneIn = (subCount ?? 0) >= (judgeCount ?? 0)
    if (event.progression === 'independent' || everyoneIn) {
      const { data: next } = await db
        .from('rounds').select('id')
        .eq('event_id', round.event_id).eq('position', round.position + 1).maybeSingle()
      if (next) await ensureRoster(db, next.id)
    }
  }

  revalidatePath('/judge/score')
  return { ok: true }
}
