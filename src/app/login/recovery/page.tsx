'use client'

import { useActionState } from 'react'
import { signInWithRecoveryCode } from './actions'
import { Brand } from '@/components/Brand'

export default function RecoveryPage() {
  const [state, action, pending] = useActionState(signInWithRecoveryCode, null)

  return (
    <div className="app">
      <div className="spot" />
      <div className="screen" style={{ paddingTop: 70 }}>
        <Brand size={40} stacked />

        <p className="eyebrow" style={{ marginTop: 40 }}>Lost your phone</p>
        <h1 className="display d-xl">Use a recovery code</h1>
        <p className="sub" style={{ marginBottom: 30 }}>
          One of the ten codes you saved when you turned on two-factor. Using one
          switches two-factor off so you can set it up again on a new device.
        </p>

        <form action={action}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" className="input" type="email" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" className="input" type="password" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="code">Recovery code</label>
            <input id="code" name="code" className="input nums" required
              placeholder="XXXX-XXXX-XXXX-XXXX"
              style={{ letterSpacing: '.08em', textTransform: 'uppercase' }} />
          </div>
          {state?.error && <p className="alert">{state.error}</p>}
          <button className="btn btn-amber btn-full" type="submit" disabled={pending}>
            {pending ? 'Checking' : 'Sign in'}
          </button>
          <a className="btn btn-quiet btn-full" href="/login" style={{ marginTop: 6 }}>Back to sign in</a>
        </form>

        <p className="sub" style={{ marginTop: 28, fontSize: 12 }}>
          Out of codes? The account owner can clear two-factor for you from their console.
        </p>
      </div>
    </div>
  )
}
