import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function EnquiriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'owner') redirect('/dashboard')

  const { data: enquiries } = await supabase
    .from('enquiries').select('*').order('created_at', { ascending: false }).limit(100)

  async function toggle(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('id') as string
    const handled = formData.get('handled') === 'true'
    await supabase.from('enquiries').update({ handled: !handled }).eq('id', id)
    revalidatePath('/backstage/enquiries')
  }

  const open = (enquiries ?? []).filter((e) => !e.handled)
  const done = (enquiries ?? []).filter((e) => e.handled)

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href="/backstage" aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">Enquiries</span>
      </header>

      <div className="screen">
        <p className="eyebrow">{open.length} waiting</p>
        <h1 className="display d-xl" style={{ marginBottom: 24 }}>Inbox</h1>

        {open.length === 0 && done.length === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>Nothing yet</h2>
            <p className="sub">Messages from the contact page land here.</p>
          </div>
        ) : (
          <ul className="list">
            {[...open, ...done].map((e) => (
              <li key={e.id} className={'enq' + (e.handled ? ' enq-done' : '')}>
                <div className="enq-top">
                  <span className="card-body">
                    <span className="card-title">{e.name}</span>
                    <span className="card-meta">
                      {e.organisation ? e.organisation + ' \u00B7 ' : ''}{e.email}
                    </span>
                  </span>
                  <span className="card-meta nums">
                    {new Date(e.created_at).toLocaleDateString('en-IE')}
                  </span>
                </div>
                <p className="enq-body">{e.message}</p>
                <div className="enq-foot">
                  <a className="acct-btn" href={'mailto:' + e.email + '?subject=EventScore'}>Reply by email</a>
                  <form action={toggle}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="handled" value={String(e.handled)} />
                    <button className="acct-btn" type="submit">
                      {e.handled ? 'Mark as waiting' : 'Mark as done'}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
