'use client'

import { useActionState } from 'react'
import { signInJudge } from './actions'
import { Brand } from '@/components/Brand'

export default function JudgeSignInPage() {
  const [state, action, pending] = useActionState(signInJudge, null)

  return (
    <div className="app">
      <div className="spot" />
      <div className="screen" style={{ paddingTop: 80 }}>
        <Brand size={30} />
        <p className="eyebrow" style={{ marginTop: 44 }}>Judges</p>
        <h1 className="display d-xl">Take your seat</h1>
        <p className="sub" style={{ marginBottom: 32 }}>
          If the organiser sent you a link, open that instead. Otherwise enter the
          event code and your PIN.
        </p>

        <form action={action}>
          <div className="field">
            <label className="label" htmlFor="code">Event code</label>
            <input id="code" name="code" className="input nums" autoCapitalize="characters"
              style={{ letterSpacing: '.22em', fontSize: 20 }} placeholder="ABC123" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="pin">Your PIN</label>
            <input id="pin" name="pin" className="input nums" inputMode="numeric" maxLength={4}
              style={{ letterSpacing: '.3em', fontSize: 22 }} placeholder="0000" required />
          </div>
          {state?.error && <p className="alert">{state.error}</p>}
          <button className="btn btn-amber btn-full" type="submit" disabled={pending} style={{ marginTop: 8 }}>
            {pending ? 'Checking' : 'Start scoring'}
          </button>
        </form>
      </div>
    </div>
  )
}
