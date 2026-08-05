'use client'

import { useActionState } from 'react'
import { changeOwnPassword } from '@/app/security/password-action'

export function ChangePassword() {
  const [state, action, pending] = useActionState(changeOwnPassword, null)

  return (
    <form action={action}>
      <p className="sub" style={{ marginTop: 0, marginBottom: 16 }}>
        At least 10 characters. A passphrase of three or four unrelated words beats
        a short one with symbols in it.
      </p>
      <div className="field">
        <label className="label" htmlFor="cur">Current password</label>
        <input id="cur" name="current" className="input" type="password" autoComplete="current-password" required />
      </div>
      <div className="field">
        <label className="label" htmlFor="nw">New password</label>
        <input id="nw" name="next" className="input" type="password" autoComplete="new-password" required />
      </div>
      <div className="field">
        <label className="label" htmlFor="ag">New password again</label>
        <input id="ag" name="again" className="input" type="password" autoComplete="new-password" required />
      </div>
      {state?.error && <p className="alert">{state.error}</p>}
      {state?.ok && <p className="ok-note">Password changed.</p>}
      <button className="btn btn-ghost btn-full" type="submit" disabled={pending}>
        {pending ? 'Changing' : 'Change password'}
      </button>
    </form>
  )
}
