'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { regenerateRecoveryCodes } from '@/app/security/actions'

export function RecoveryCodes({ remaining, email }: { remaining: number; email: string }) {
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const router = useRouter()

  function make() {
    setError(null)
    start(async () => {
      const res = await regenerateRecoveryCodes()
      if (res?.error) { setError(res.error); return }
      setCodes(res.codes ?? null)
      router.refresh()
    })
  }

  function download() {
    if (!codes) return
    const body = [
      'EventScore recovery codes',
      'Account: ' + email,
      'Created: ' + new Date().toLocaleString('en-IE'),
      '',
      'Each code works once. Keep this somewhere safe and private.',
      'Using a code switches two-factor off so you can set it up again.',
      '',
      ...codes.map((c, i) => (i + 1) + '.  ' + c),
    ].join('\n')

    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'eventscore-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (codes) {
    return (
      <div className="codes">
        <p className="eyebrow">Save these now</p>
        <p className="sub" style={{ marginTop: 0 }}>
          They will not be shown again. Each works once.
        </p>
        <ol className="codelist nums">
          {codes.map((c) => <li key={c}>{c}</li>)}
        </ol>
        <button className="btn btn-amber btn-full" onClick={download}>Download as a file</button>
        <button className="btn btn-quiet btn-full" onClick={() => setCodes(null)} style={{ marginTop: 6 }}>
          I have saved them
        </button>
      </div>
    )
  }

  return (
    <>
      <p className="sub" style={{ marginTop: 0 }}>
        {remaining > 0
          ? remaining + ' unused code' + (remaining === 1 ? '' : 's') + ' remaining. Generating new ones cancels the old.'
          : 'Ten one-time codes to get back in if you lose your authenticator.'}
      </p>
      {error && <p className="alert" style={{ marginTop: 12 }}>{error}</p>}
      <button className="btn btn-ghost btn-full" disabled={busy} onClick={make} style={{ marginTop: 14 }}>
        {busy ? 'Generating' : remaining > 0 ? 'Generate new codes' : 'Generate recovery codes'}
      </button>
    </>
  )
}
