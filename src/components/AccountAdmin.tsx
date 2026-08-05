'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateAccountDetails, setRole, resetPassword, clearTwoFactor } from '@/app/backstage/actions'

export function AccountAdmin({
  profileId, email, orgName, role, isOnlyOwner,
}: {
  profileId: string; email: string; orgName: string | null
  role: 'owner' | 'customer'; isOnlyOwner: boolean
}) {
  const [panel, setPanel] = useState<'none' | 'details' | 'role'>('none')
  const [issued, setIssued] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const router = useRouter()

  function run(fn: () => Promise<{ error?: string; ok?: boolean } | void>, after?: () => void) {
    setError(null); setNote(null)
    start(async () => {
      const res = await fn()
      if (res && 'error' in res && res.error) { setError(res.error); return }
      after?.()
      router.refresh()
    })
  }

  return (
    <div className="acct">
      <div className="acct-row">
        <button className="acct-btn" onClick={() => setPanel(panel === 'details' ? 'none' : 'details')}>
          Edit details
        </button>
        <button className="acct-btn" disabled={busy}
          onClick={() => run(async () => {
            const res = await resetPassword(profileId)
            if (res.ok && res.password) setIssued(res.password)
            return res
          })}>
          Reset password
        </button>
        <button className="acct-btn" disabled={busy}
          onClick={() => run(() => clearTwoFactor(profileId), () => setNote('Two-factor cleared.'))}>
          Clear 2FA
        </button>
        <button className="acct-btn" onClick={() => setPanel(panel === 'role' ? 'none' : 'role')}>
          {role === 'owner' ? 'Owner' : 'Customer'}
        </button>
      </div>

      {error && <p className="alert" style={{ marginTop: 12 }}>{error}</p>}
      {note && <p className="ok-note" style={{ marginTop: 12 }}>{note}</p>}

      {issued && (
        <div className="tempkey">
          <span className="label" style={{ margin: 0 }}>New password, shown once</span>
          <code>{issued}</code>
          <button className="btn btn-quiet" onClick={() => setIssued(null)} style={{ marginTop: 8 }}>
            I have copied it
          </button>
        </div>
      )}

      {panel === 'details' && (
        <form className="limit-form" action={(fd) => run(() => updateAccountDetails(profileId, fd), () => setPanel('none'))}>
          <label className="label" htmlFor={'em' + profileId}>Email</label>
          <input id={'em' + profileId} name="email" className="input" type="email" defaultValue={email} required />
          <label className="label" htmlFor={'og' + profileId}>Organisation</label>
          <input id={'og' + profileId} name="org_name" className="input" defaultValue={orgName ?? ''} />
          <button className="btn btn-amber btn-full" type="submit" disabled={busy}>Save details</button>
        </form>
      )}

      {panel === 'role' && (
        <div className="limit-form">
          <p className="sub" style={{ marginTop: 0 }}>
            {role === 'owner'
              ? 'Owners can manage every account, including yours. Demote with care.'
              : 'Promoting makes this person an owner. They will be able to create, disable and delete accounts, including yours.'}
          </p>
          {role === 'owner' && isOnlyOwner ? (
            <p className="sub" style={{ fontSize: 12 }}>This is the only owner and cannot be demoted.</p>
          ) : (
            <button className="btn btn-ghost btn-full" disabled={busy}
              onClick={() => run(() => setRole(profileId, role === 'owner' ? 'customer' : 'owner'), () => setPanel('none'))}>
              {role === 'owner' ? 'Demote to customer' : 'Promote to owner'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
