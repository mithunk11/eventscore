'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCustomer } from '@/app/backstage/actions'
import { Sheet } from '@/components/Sheet'

export function AddCustomer() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(createCustomer, null)
  const router = useRouter()

  function done() {
    setOpen(false)
    router.refresh()
  }

  if (state?.ok && open) {
    return (
      <>
        <button className="btn btn-amber btn-full" onClick={() => setOpen(true)}>Add customer</button>
        <Sheet onClose={done}>
          <p className="eyebrow">Account created</p>
          <h2 className="display d-l" style={{ marginBottom: 8 }}>{state.email}</h2>
          <p className="sub">
            Send them this password. It is shown once and cannot be retrieved.
            Ask them to change it after signing in.
          </p>
          <div className="tempkey">
            <span className="label" style={{ margin: 0 }}>Temporary password</span>
            <code>{state.tempPassword}</code>
          </div>
          <button className="btn btn-amber btn-full" onClick={done} style={{ marginTop: 18 }}>
            Done, I have copied it
          </button>
        </Sheet>
      </>
    )
  }

  return (
    <>
      <button className="btn btn-amber btn-full" onClick={() => setOpen(true)}>Add customer</button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <p className="eyebrow">New customer</p>
          <h2 className="display d-l" style={{ marginBottom: 20 }}>Create an account</h2>
          <form action={action}>
            <div className="field">
              <label className="label" htmlFor="cem">Their email</label>
              <input id="cem" name="email" className="input" type="email" required placeholder="organiser@example.com" />
            </div>
            <div className="field">
              <label className="label" htmlFor="cor">Organisation</label>
              <input id="cor" name="org_name" className="input" placeholder="Galway Events" />
            </div>
            <div className="field">
              <label className="label" htmlFor="cev">Events allowed</label>
              <input id="cev" name="events" className="input nums" type="number" min="1" defaultValue="1" />
            </div>
            <div className="field">
              <label className="label" htmlFor="ccon">Contestants per event</label>
              <input id="ccon" name="contestants" className="input nums" type="number" min="1" defaultValue="30" />
            </div>
            <div className="field">
              <label className="label" htmlFor="cju">Judges per event</label>
              <input id="cju" name="judges" className="input nums" type="number" min="1" defaultValue="5" />
            </div>
            {state?.error && <p className="alert">{state.error}</p>}
            <button className="btn btn-amber btn-full" type="submit" disabled={pending}>
              {pending ? 'Creating' : 'Create account'}
            </button>
            <button className="btn btn-quiet btn-full" type="button" onClick={() => setOpen(false)} style={{ marginTop: 6 }}>
              Cancel
            </button>
          </form>
        </Sheet>
      )}
    </>
  )
}
