import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const LABEL: Record<string, string> = {
  terms: 'I have read and accept the Terms of Service, Privacy Policy and Data Processing Agreement, and I have authority to accept them on behalf of my organisation.',
  age: 'I confirm that all contestants and judges in my events are aged 18 or over, and that I will not upload information about any person under 18.',
  consent: 'I confirm that I have obtained consent from every contestant and judge for their name, photograph and description to be processed by EventScore for the purpose of running my event, and I understand that I am the data controller for this information.',
}

export default async function AcceptanceRecordPage({
  params, searchParams,
}: {
  params: Promise<{ profileId: string }>
  searchParams: Promise<{ v?: string }>
}) {
  const { profileId } = await params
  const { v } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'owner') redirect('/dashboard')

  const { data: person } = await supabase
    .from('profiles').select('email, org_name, created_at').eq('id', profileId).maybeSingle()
  if (!person) notFound()

  let query = supabase.from('acceptances').select('*').eq('profile_id', profileId)
  if (v) query = query.eq('version', v)
  const { data: items } = await query.order('accepted_at')

  return (
    <div className="sheetpage">
      <div className="noprint printbar">
        <a className="btn btn-quiet" href="/backstage/acceptances">Back</a>
        <span className="sub" style={{ margin: 0 }}>Use your browser&rsquo;s Print, then Save as PDF</span>
      </div>

      <article className="paper">
        <header className="paper-head">
          <h1>Record of acceptance</h1>
          <p>EventScore &middot; generated {new Date().toLocaleString('en-IE')}</p>
        </header>

        <section className="paper-block">
          <h2>Accepted by</h2>
          <table>
            <tbody>
              <tr><td>Organisation</td><td>{person.org_name ?? 'Not given'}</td></tr>
              <tr><td>Email</td><td>{person.email}</td></tr>
              <tr><td>Account created</td><td>{new Date(person.created_at).toLocaleString('en-IE')}</td></tr>
              <tr><td>Document version</td><td>{v ?? 'all versions'}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="paper-block">
          <h2>Confirmations given</h2>
          {(items ?? []).map((it) => (
            <div key={it.id} style={{ marginBottom: 18 }}>
              <p style={{ margin: '0 0 4px' }}><strong>&#10003; {LABEL[it.document] ?? it.document}</strong></p>
              <p className="paper-note" style={{ margin: 0 }}>
                Version {it.version} &middot; accepted {new Date(it.accepted_at).toLocaleString('en-IE')}
              </p>
            </div>
          ))}
        </section>

        <footer className="paper-foot">
          This record is generated from the acceptance log. It shows which version of
          each document was accepted and when.
        </footer>
      </article>
    </div>
  )
}
