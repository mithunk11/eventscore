'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Brand } from '@/components/Brand'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="app">
      <div className="spot" />
      <div className="screen" style={{ paddingTop: 90 }}>
        <Brand size={30} />
        <p className="eyebrow" style={{ marginTop: 46 }}>House lights down</p>
        <h1 className="display d-xl">Sign in</h1>
        <p className="sub" style={{ marginBottom: 34 }}>
          Set up an event, or open the judges&rsquo; scorecards.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="alert">{error}</p>}
          <button className="btn btn-amber btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
