'use client'

import { useActionState } from 'react'
import { saveBackupEmail } from '@/app/security/actions'

export function BackupEmail({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState(saveBackupEmail, null)

  return (
    <form action={action}>
      <p className="sub" style={{ marginTop: 0 }}>
        A second address the account owner can use to check it is really you before
        clearing your two-factor. Not used for signing in.
      </p>
      <div className="field" style={{ marginTop: 14 }}>
        <label className="label" htmlFor="backup">Backup email</label>
        <input id="backup" name="backup_email" className="input" type="email"
          defaultValue={current ?? ''} placeholder="another@example.com" />
      </div>
      {state?.error && <p className="alert">{state.error}</p>}
      {state?.ok && <p className="ok-note">Saved.</p>}
      <button className="btn btn-ghost btn-full" type="submit" disabled={pending}>
        {pending ? 'Saving' : 'Save backup email'}
      </button>
    </form>
  )
}
