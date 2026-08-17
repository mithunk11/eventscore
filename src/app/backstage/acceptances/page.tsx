import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const LABEL: Record<string, string> = {
  terms: 'Terms, Privacy and Data Processing Agreement',
  age: 'All participants aged 18 or over',
  consent: 'Consent obtained from contestants and judges',
}

export default async function AcceptancesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'owner') redirect('/dashboard')

  const { data: rows } = await supabase
    .from('acceptances').select('*').order('accepted_at', { ascending: false })

  const { data: profiles } = await supabase.from('profiles').select('id, email, org_name')
  const who = new Map((profiles ?? []).map((p) => [p.id, p]))

  const grouped = new Map<string, typeof rows>()
  for (const r of rows ?? []) {
    const key = r.profile_id + '|' + r.version
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href="/backstage" aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">Agreements</span>
      </header>

      <div className="screen">
        <p className="eyebrow">{grouped.size} signed</p>
        <h1 className="display d-xl">Acceptance records</h1>
        <p className="sub" style={{ marginBottom: 24 }}>
          Who accepted which version, and when. This is the record that matters if
          anyone ever disputes consent.
        </p>

        {grouped.size === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>Nothing yet</h2>
            <p className="sub">Records appear when a customer accepts the terms.</p>
          </div>
        ) : (
          <ul className="list">
            {Array.from(grouped.entries()).map(([key, items]) => {
              const first = items![0]
              const person = who.get(first.profile_id)
              return (
                <li key={key} className="accept-rec">
                  <div className="customer-top">
                    <span className="card-body">
                      <span className="card-title">{person?.org_name || person?.email || 'Unknown'}</span>
                      <span className="card-meta">{person?.email}</span>
                    </span>
                    <span className="tag tag-final">v{first.version}</span>
                  </div>

                  <ul className="accept-items">
                    {items!.map((it) => (
                      <li key={it.id}>
                        <span>&#10003; {LABEL[it.document] ?? it.document}</span>
                        <span className="nums">{new Date(it.accepted_at).toLocaleString('en-IE')}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="enq-foot">
                    <a className="acct-btn" href={'/backstage/acceptances/' + first.profile_id + '?v=' + first.version}>
                      Open printable record
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
