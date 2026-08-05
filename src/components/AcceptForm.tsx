'use client'

import { useActionState } from 'react'
import { acceptTerms } from '@/app/accept/actions'

export function AcceptForm() {
  const [state, action, pending] = useActionState(acceptTerms, null)

  return (
    <form action={action}>
      <label className="tick">
        <input type="checkbox" name="terms" />
        <span>
          I have read and accept the <a href="/terms" target="_blank">Terms of Service</a>,{' '}
          <a href="/privacy" target="_blank">Privacy Policy</a> and{' '}
          <a href="/dpa" target="_blank">Data Processing Agreement</a>, and I have
          authority to accept them for my organisation.
        </span>
      </label>

      <label className="tick">
        <input type="checkbox" name="age" />
        <span>
          All contestants and judges in my events are aged 18 or over, and I will not
          upload information about anyone under 18.
        </span>
      </label>

      <label className="tick">
        <input type="checkbox" name="consent" />
        <span>
          I have consent from every contestant and judge for their name, photograph
          and description to be processed for the purpose of running my event.
        </span>
      </label>

      {state?.error && <p className="alert" style={{ marginTop: 18 }}>{state.error}</p>}

      <button className="btn btn-amber btn-full" type="submit" disabled={pending} style={{ marginTop: 20 }}>
        {pending ? 'Saving' : 'Agree and continue'}
      </button>
    </form>
  )
}
