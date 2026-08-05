'use client'

import { useActionState } from 'react'
import { sendEnquiry } from '@/app/contact-action'

export function ContactForm() {
  const [state, action, pending] = useActionState(sendEnquiry, null)

  if (state?.ok) {
    return (
      <div className="sent">
        <h3 className="display d-l" style={{ marginBottom: 8 }}>Thanks, that is with us</h3>
        <p className="sub" style={{ margin: 0 }}>
          We read everything and usually reply within a day or two.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="contact-form">
      <div className="pair">
        <div className="field">
          <label className="label" htmlFor="nm">Your name</label>
          <input id="nm" name="name" className="input" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="em">Email</label>
          <input id="em" name="email" className="input" type="email" required />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="og">Organisation</label>
        <input id="og" name="organisation" className="input" placeholder="Optional" />
      </div>

      <div className="field">
        <label className="label" htmlFor="ms">What are you running?</label>
        <textarea id="ms" name="message" className="input" rows={5} required
          placeholder="Tell us about your competition — roughly how many entrants, judges and rounds." />
      </div>

      <input type="text" name="website" tabIndex={-1} autoComplete="off"
        aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />

      {state?.error && <p className="alert">{state.error}</p>}

      <button className="btn btn-amber" type="submit" disabled={pending} style={{ minWidth: 180 }}>
        {pending ? 'Sending' : 'Send enquiry'}
      </button>
    </form>
  )
}
