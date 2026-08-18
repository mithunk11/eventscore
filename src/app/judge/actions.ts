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

/**
 * Saves several marks in one request. Dragging a slider fires many changes;
 * sending one request each is what made scoring feel slow.
 */
export async function saveMarks(
  rows: { entryId: string; categoryId: string; value: number }[]
) {
  if (rows.length === 0) return { ok: true }

  const session = await getJudgeSession()
  if (!session) return { error: 'Your session expired.' }
  const { judge, db } = session

  const entryIds = Array.from(new Set(rows.map((r) => r.entryId)))
  const { data: entries } = await db
    .from('entries').select('id, round_id, rounds(event_id)').in('id', entryIds)

  const mine = new Set(
    (entries ?? [])
      .filter((e) => (e.rounds as unknown as { event_id: string }).event_id === judge.event_id)
      .map((e) => e.id)
  )
  const roundIds = Array.from(new Set((entries ?? []).map((e) => e.round_id)))

  const { data: subs } = await db
    .from('submissions').select('round_id').eq('judge_id', judge.id).in('round_id', roundIds)
  const locked = new Set((subs ?? []).map((s) => s.round_id))
  const lockedEntries = new Set(
    (entries ?? []).filter((e) => locked.has(e.round_id)).map((e) => e.id)
  )

  const payload = rows
    .filter((r) => mine.has(r.entryId) && !lockedEntries.has(r.entryId))
    .map((r) => ({
      judge_id: judge.id,
      entry_id: r.entryId,
      category_id: r.categoryId,
      value: r.value,
      updated_at: new Date().toISOString(),
    }))

  if (payload.length === 0) return { ok: true }

  const { error } = await db.from('scores').upsert(payload, {
    onConflict: 'judge_id,entry_id,category_id',
  })
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

  // Fetch everything independent in one go rather than one after another
  const [catsRes, entriesRes, roundRes, judgesRes] = await Promise.all([
    db.from('categories').select('id').eq('round_id', roundId),
    db.from('entries').select('id').eq('round_id', roundId),
    db.from('rounds').select('event_id, position').eq('id', roundId).maybeSingle(),
    db.from('judges').select('id').eq('event_id', judge.event_id).eq('status', 'active'),
  ])

  const categories = catsRes.data ?? []
  const entries = entriesRes.data ?? []
  if (!categories.length) return { error: 'This round has no categories yet. Ask the organiser to add them.' }
  if (!entries.length) return { error: 'No contestants are in this round yet.' }

  // Anything the judge never touched counts as zero, so there is nothing
  // to be "incomplete" — submission is never blocked on unmarked categories.

  if (event.comments_mode === 'required') {
    const entryIds = entries.map((e) => e.id)
    const { data: notes } = await db
      .from('entry_comments').select('body')
      .eq('judge_id', judge.id).in('entry_id', entryIds)
    const written = (notes ?? []).filter((n) => n.body && n.body.trim().length > 0).length
    if (written < entries.length) {
      return { error: 'This event asks for a comment on every contestant.' }
    }
  }

  const { error: subError } = await db.from('submissions').upsert(
    { judge_id: judge.id, round_id: roundId },
    { onConflict: 'judge_id,round_id' }
  )
  if (subError) return { error: subError.message }

  const round = roundRes.data
  if (round) {
    const judgeCount = (judgesRes.data ?? []).length
    const { count: subCount } = await db
      .from('submissions').select('judge_id', { count: 'exact', head: true }).eq('round_id', roundId)

    // Synchronised events only open the next round once every judge is in
    const everyoneIn = (subCount ?? 0) >= judgeCount
    if (event.progression === 'independent' || everyoneIn) {
      const { data: next } = await db
        .from('rounds').select('id')
        .eq('event_id', round.event_id).eq('position', round.position + 1).maybeSingle()
      if (next) await ensureRoster(db, next.id)
    }
  }

  // No revalidatePath here: the client calls router.refresh() itself.
  // Doing both makes the transition never settle and the button sticks.
  return { ok: true }
}
