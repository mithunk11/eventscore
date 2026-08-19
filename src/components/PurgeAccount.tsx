'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { purgeAccount } from '@/app/backstage/actions'
import { Spinner } from '@/components/Loading'

export function PurgeAccount({
  profileId, email, eventCount,
}: {
  profileId: string; email: string; eventCount: number
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const router = useRouter()

  function purge() {
    setError(null)
    start(async () => {
      const res = await purgeAccount(profileId, typed)
      if (res?.error) { setError(res.error); return }
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button className="acct-btn acct-btn-danger" onClick={() => setOpen(true)}>
        Delete permanently
      </button>
    )
  }

  return (
    <div className="purge">
      <p className="purge-warn">
        <strong>This cannot be undone.</strong> It removes the sign-in, the profile,
        {eventCount > 0
          ? ` ${eventCount} event${eventCount === 1 ? '' : 's'} with every contestant, judge and mark in ${eventCount === 1 ? 'it' : 'them'},`
          : ' any events,'}
        {' '}and all their photographs. Nothing is kept and no backup is made.
      </p>
      <p className="purge-warn">
        Afterwards the email address is free to use for a new account.
      </p>

      <div className="field" style={{ marginTop: 12 }}>
        <label className="label" htmlFor={'pg' + profileId}>
          Type <strong style={{ color: 'var(--ink)' }}>{email}</strong> to confirm
        </label>
        <input id={'pg' + profileId} className="input" value={typed}
          onChange={(e) => setTyped(e.target.value)} placeholder={email}
          autoComplete="off" />
      </div>

      {error && <p className="alert">{error}</p>}

      <button className="btn btn-danger btn-full" disabled={busy || typed.trim().toLowerCase() !== email.toLowerCase()}
        onClick={purge}>
        {busy ? <Spinner label="Deleting" /> : 'Delete permanently'}
      </button>
      <button className="btn btn-quiet btn-full" style={{ marginTop: 6 }}
        onClick={() => { setOpen(false); setTyped(''); setError(null) }}>
        Cancel
      </button>
    </div>
  )
}
