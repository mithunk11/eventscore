'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { makeHeadJudge, moveJudge } from '@/app/events/actions'

export function JudgeOrder({
  eventId, judgeId, isHead, isFirst, isLast,
}: {
  eventId: string; judgeId: string; isHead: boolean; isFirst: boolean; isLast: boolean
}) {
  const [busy, start] = useTransition()
  const router = useRouter()

  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh() })

  return (
    <div className="order-row">
      <button className="order-btn" disabled={isFirst || busy}
        onClick={() => run(() => moveJudge(eventId, judgeId, 'up'))} aria-label="Move up">&uarr;</button>
      <button className="order-btn" disabled={isLast || busy}
        onClick={() => run(() => moveJudge(eventId, judgeId, 'down'))} aria-label="Move down">&darr;</button>
      {!isHead && (
        <button className="order-head" disabled={busy}
          onClick={() => run(() => makeHeadJudge(eventId, judgeId))}>Make head judge</button>
      )}
    </div>
  )
}
