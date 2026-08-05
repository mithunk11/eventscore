'use client'

import { useActionState } from 'react'
import { signInWithToken } from '@/app/judge/actions'

export function JudgePinForm({ inviteToken }: { inviteToken: string }) {
  const [state, action, pending] = useActionState(signInWithToken, null)

  return (
    <form action={action} style={{ marginTop: 28 }}>
      <input type="hidden" name="inviteToken" value={inviteToken} />
      <div className="field">
        <label className="label" htmlFor="pin">Your PIN</label>
        <input id="pin" name="pin" className="input nums" inputMode="numeric" maxLength={4}
          autoFocus style={{ letterSpacing: '.3em', fontSize: 24, textAlign: 'center' }}
          placeholder="0000" required />
      </div>
      {state?.error && <p className="alert">{state.error}</p>}
      <button className="btn btn-amber btn-full" type="submit" disabled={pending}>
        {pending ? 'Checking' : 'Open my scorecard'}
      </button>
    </form>
  )
}
