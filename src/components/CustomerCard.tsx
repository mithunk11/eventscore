'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setAccess, setLimits, softDelete, restore } from '@/app/backstage/actions'
import { AccountAdmin } from '@/components/AccountAdmin'
import { PurgeAccount } from '@/components/PurgeAccount'

type Customer = {
  id: string
  email: string
  org_name: string | null
  access: 'full' | 'readonly' | 'disabled'
  status: string
  deleted_at: string | null
  max_active_events: number
  max_contestants: number
  max_judges: number
  eventCount: number
  adminUntil: string | null
  backupEmail: string | null
  role: 'owner' | 'customer'
  isOnlyOwner: boolean
}

const STATES: { key: 'full' | 'readonly' | 'disabled'; label: string }[] = [
  { key: 'full', label: 'Full' },
  { key: 'readonly', label: 'Read only' },
  { key: 'disabled', label: 'Disabled' },
]

export function CustomerCard({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, start] = useTransition()
  const router = useRouter()

  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh() })
  const deleted = customer.status === 'deleted'

  const graceLeft = customer.deleted_at
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(customer.deleted_at).getTime()) / 86_400_000))
    : null

  return (
    <li className={'customer' + (deleted ? ' customer-gone' : '')}>
      <div className="customer-top">
        <span className="card-body">
          <span className="card-title">{customer.org_name || customer.email}</span>
          <span className="card-meta">{customer.org_name ? customer.email : 'No organisation name'}</span>
          {customer.backupEmail && <span className="card-meta">Backup: {customer.backupEmail}</span>}
        </span>
        <span className="count nums">{customer.eventCount} event{customer.eventCount === 1 ? '' : 's'}</span>
      </div>

      {deleted ? (
        <>
          <div className="override" style={{ marginTop: 12 }}>
            <p className="sub" style={{ margin: 0 }}>
              Deleted. Data is purged in {graceLeft} day{graceLeft === 1 ? '' : 's'}.
            </p>
            <button className="btn btn-ghost" style={{ minHeight: 40, fontSize: 13 }} disabled={busy}
              onClick={() => run(() => restore(customer.id))}>Restore</button>
          </div>

          <div className="purge-row">
            <PurgeAccount profileId={customer.id} email={customer.email}
              eventCount={customer.eventCount} />
          </div>
        </>
      ) : (
        <>
          <div className="seg">
            {STATES.map((s) => (
              <button key={s.key} disabled={busy}
                aria-pressed={customer.access === s.key}
                onClick={() => run(() => setAccess(customer.id, s.key))}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="limits nums">
            <span>{customer.max_active_events} events</span>
            <span>{customer.max_contestants} contestants</span>
            <span>{customer.max_judges} judges</span>
            <button className="btn btn-quiet" onClick={() => setOpen(!open)}>
              {open ? 'Close' : 'Change'}
            </button>
          </div>

          {open && (
            <form className="limit-form" action={(fd) => run(() => setLimits(customer.id, fd))}>
              <label className="label" htmlFor={'e' + customer.id}>Events</label>
              <input id={'e' + customer.id} name="events" className="input nums" type="number" min="0"
                defaultValue={customer.max_active_events} />
              <label className="label" htmlFor={'c' + customer.id}>Contestants</label>
              <input id={'c' + customer.id} name="contestants" className="input nums" type="number" min="0"
                defaultValue={customer.max_contestants} />
              <label className="label" htmlFor={'j' + customer.id}>Judges</label>
              <input id={'j' + customer.id} name="judges" className="input nums" type="number" min="0"
                defaultValue={customer.max_judges} />
              <button className="btn btn-amber btn-full" type="submit" disabled={busy} style={{ marginTop: 12 }}>
                Save limits
              </button>
            </form>
          )}

          <AccountAdmin profileId={customer.id} email={customer.email}
            orgName={customer.org_name} role={customer.role} isOnlyOwner={customer.isOnlyOwner} />

          <div className="customer-foot">
            <span className="sub" style={{ margin: 0, fontSize: 12 }}>
              {customer.adminUntil && new Date(customer.adminUntil) > new Date()
                ? 'Data visible to you until ' + new Date(customer.adminUntil).toLocaleString('en-IE')
                : 'Their data is not visible to you'}
            </span>
            {!confirming ? (
              <button className="trash" onClick={() => setConfirming(true)}>Delete</button>
            ) : (
              <span style={{ display: 'flex', gap: 8 }}>
                <button className="trash" style={{ color: 'var(--magenta)' }} disabled={busy}
                  onClick={() => run(() => softDelete(customer.id))}>Confirm</button>
                <button className="trash" onClick={() => setConfirming(false)}>Cancel</button>
              </span>
            )}
          </div>
        </>
      )}
    </li>
  )
}
