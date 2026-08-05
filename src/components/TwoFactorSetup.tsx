'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Factor = { id: string; friendly_name?: string | null; status: string }

export function TwoFactorSetup({ existing }: { existing: Factor[] }) {
  const [stage, setStage] = useState<'idle' | 'scan'>('idle')
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const verified = existing.filter((f) => f.status === 'verified')

  async function begin() {
    setBusy(true); setError(null)
    const supabase = createClient()

    // Clear any half-finished attempt, or enrolling again fails
    for (const f of existing.filter((x) => x.status !== 'verified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp', friendlyName: 'Authenticator ' + Date.now(),
    })
    setBusy(false)

    if (error) { setError(error.message); return }
    setFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
    setStage('scan')
  }

  async function confirm() {
    if (!factorId) return
    setBusy(true); setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    setBusy(false)

    if (error) { setError('That code was not accepted. Check your app and try the next one.'); return }
    setStage('idle'); setCode(''); setQr(null); setSecret(null)
    router.refresh()
  }

  async function turnOff(id: string) {
    setBusy(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    setBusy(false)
    if (error) { setError(error.message); return }
    router.refresh()
  }

  if (verified.length > 0) {
    return (
      <>
        <div className="ok-note">
          Two-factor authentication is on. You will be asked for a code from your
          authenticator app each time you sign in.
        </div>
        <p className="sub" style={{ marginBottom: 18 }}>
          If you lose your phone, the account owner can clear this for you from the
          admin console. There is no self-service recovery, so keep your
          authenticator app backed up.
        </p>
        {error && <p className="alert">{error}</p>}
        {verified.map((f) => (
          <button key={f.id} className="btn btn-ghost btn-full" disabled={busy}
            onClick={() => turnOff(f.id)}>
            {busy ? 'Working' : 'Turn off two-factor'}
          </button>
        ))}
      </>
    )
  }

  if (stage === 'scan' && qr) {
    return (
      <>
        <p className="sub" style={{ marginTop: 0 }}>
          Scan this with Google Authenticator, 1Password, Authy or similar, then
          type the six digit code it shows.
        </p>
        <div className="qrbox">
          <img src={qr} alt="Two-factor QR code" width={200} height={200} />
        </div>
        {secret && (
          <div className="tempkey">
            <span className="label" style={{ margin: 0 }}>Or type this key by hand</span>
            <code>{secret}</code>
          </div>
        )}
        <div className="field" style={{ marginTop: 20 }}>
          <label className="label" htmlFor="mfa">Six digit code</label>
          <input id="mfa" className="input nums" inputMode="numeric" maxLength={6}
            value={code} onChange={(e) => setCode(e.target.value)}
            style={{ letterSpacing: '.3em', fontSize: 22, textAlign: 'center' }}
            placeholder="000000" autoFocus />
        </div>
        {error && <p className="alert">{error}</p>}
        <button className="btn btn-amber btn-full" disabled={busy || code.length < 6} onClick={confirm}>
          {busy ? 'Checking' : 'Turn on two-factor'}
        </button>
        <button className="btn btn-quiet btn-full" onClick={() => setStage('idle')} style={{ marginTop: 6 }}>
          Cancel
        </button>
      </>
    )
  }

  return (
    <>
      <p className="sub" style={{ marginTop: 0, marginBottom: 20 }}>
        Adds a six digit code from your phone on top of your password. Strongly
        recommended if you manage other people&rsquo;s accounts.
      </p>
      {error && <p className="alert">{error}</p>}
      <button className="btn btn-amber btn-full" disabled={busy} onClick={begin}>
        {busy ? 'Preparing' : 'Set up two-factor'}
      </button>
    </>
  )
}
