'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Brand } from '@/components/Brand'

export default function LoginPage() {
  const [step, setStep] = useState<'password' | 'code'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    // Password alone is enough unless a verified factor exists on this account.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const verified = factors?.totp?.find((f) => f.status === 'verified')
      if (verified) {
        setFactorId(verified.id)
        setStep('code')
        setLoading(false)
        return
      }
    }

    router.push('/dashboard'); router.refresh()
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setLoading(true); setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    if (error) {
      setError('That code was not accepted. Wait for the next one and try again.')
      setLoading(false); setCode(''); return
    }

    router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="app">
      <div className="spot" />
      <div className="screen" style={{ paddingTop: 80 }}>
        <Brand size={46} stacked />

        {step === 'password' ? (
          <>
            <p className="eyebrow" style={{ marginTop: 46 }}>Organisers</p>
            <h1 className="display d-xl">Sign in</h1>
            <p className="sub" style={{ marginBottom: 34 }}>
              Set up an event, or watch one as it runs.
            </p>

            <form onSubmit={submitPassword}>
              <div className="field">
                <label className="label" htmlFor="email">Email</label>
                <input id="email" className="input" type="email" inputMode="email" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label className="label" htmlFor="password">Password</label>
                <input id="password" className="input" type="password" autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="alert">{error}</p>}
              <button className="btn btn-amber btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Signing in' : 'Sign in'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="eyebrow" style={{ marginTop: 46 }}>One more step</p>
            <h1 className="display d-xl">Your code</h1>
            <p className="sub" style={{ marginBottom: 34 }}>
              Open your authenticator app and type the six digits it shows for EventScore.
            </p>

            <form onSubmit={submitCode}>
              <div className="field">
                <label className="label" htmlFor="code">Six digit code</label>
                <input id="code" className="input nums" inputMode="numeric" maxLength={6} autoFocus
                  value={code} onChange={(e) => setCode(e.target.value)}
                  style={{ letterSpacing: '.3em', fontSize: 24, textAlign: 'center' }}
                  placeholder="000000" required />
              </div>
              {error && <p className="alert">{error}</p>}
              <button className="btn btn-amber btn-full" type="submit" disabled={loading || code.length < 6}>
                {loading ? 'Checking' : 'Continue'}
              </button>
              <button className="btn btn-quiet btn-full" type="button" style={{ marginTop: 6 }}
                onClick={() => { setStep('password'); setCode(''); setError(null) }}>
                Back
              </button>
              <a className="btn btn-quiet btn-full" href="/login/recovery" style={{ marginTop: 2 }}>
                Lost your phone?
              </a>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
