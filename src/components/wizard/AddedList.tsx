'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { removeItem } from '@/app/events/wizard-actions'

export function AddedList({
  eventId, table, items, empty,
}: {
  eventId: string
  table: 'rounds' | 'categories' | 'contestants' | 'judges'
  items: { id: string; primary: string; secondary?: string }[]
  empty: string
}) {
  const [busy, start] = useTransition()
  const router = useRouter()

  if (items.length === 0) {
    return <p className="wiz-empty">{empty}</p>
  }

  return (
    <ul className="list wiz-added">
      {items.map((it) => (
        <li key={it.id} className="card">
          <span className="card-body">
            <span className="card-title">{it.primary}</span>
            {it.secondary && <span className="card-meta">{it.secondary}</span>}
          </span>
          <button className="trash" disabled={busy}
            onClick={() => start(async () => {
              await removeItem(eventId, table, it.id)
              router.refresh()
            })}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  )
}
