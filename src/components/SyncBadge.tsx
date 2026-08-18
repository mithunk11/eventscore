'use client'

import type { SyncState } from '@/components/useMarkSync'

export function SyncBadge({ state, waiting }: { state: SyncState; waiting: number }) {
  if (state === 'idle') return null

  const label = {
    saving: waiting > 1 ? 'Saving ' + waiting : 'Saving',
    saved: 'Saved',
    offline: waiting > 0 ? waiting + ' waiting' : 'No connection',
    error: 'Retrying',
  }[state]

  return (
    <span className={'syncbadge syncbadge-' + state} role="status" aria-live="polite">
      {state === 'saving' && <span className="dot-pulse" aria-hidden="true" />}
      {state === 'saved' && <span aria-hidden="true">&#10003;</span>}
      {state === 'offline' && <span className="wifi-off" aria-hidden="true" />}
      {state === 'error' && <span className="dot-pulse" aria-hidden="true" />}
      {label}
    </span>
  )
}
