import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CustomerCard } from '@/components/CustomerCard'
import { Brand } from '@/components/Brand'
import { AddCustomer } from '@/components/AddCustomer'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'owner') redirect('/dashboard')

  const { data: customers } = await supabase
    .from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false })

  // Counts only. There is no query here for event names, contestants or scores,
  // and no policy that would allow one.
  const withCounts = []
  for (const c of customers ?? []) {
    const { data: n } = await supabase.rpc('customer_event_count', { p_owner: c.id })
    withCounts.push({
      id: c.id, email: c.email, org_name: c.org_name,
      access: c.access ?? 'full', status: c.status ?? 'active', deleted_at: c.deleted_at,
      max_active_events: c.max_active_events ?? 1,
      max_contestants: c.max_contestants ?? 30,
      max_judges: c.max_judges ?? 5,
      eventCount: Number(n ?? 0),
      adminUntil: c.admin_access_until,
    })
  }

  const active = withCounts.filter((c) => c.status !== 'deleted')
  const gone = withCounts.filter((c) => c.status === 'deleted')

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <Brand />
        <span style={{ flex: 1 }} />
        <a className="btn btn-quiet" href="/dashboard">My events</a>
      </header>

      <div className="screen">
        <p className="eyebrow">Owner</p>
        <h1 className="display d-xl">Customers</h1>
        <p className="sub" style={{ marginBottom: 26 }}>
          You can set access and limits. Event names, contestants and scores are not
          readable from here.
        </p>

        {active.length === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>No customers yet</h2>
            <p className="sub">Add your first customer below.</p>
          </div>
        ) : (
          <ul className="list">
            {active.map((c) => <CustomerCard key={c.id} customer={c} />)}
          </ul>
        )}

        {gone.length > 0 && (
          <>
            <p className="eyebrow eyebrow-quiet" style={{ marginTop: 32 }}>Pending deletion</p>
            <ul className="list">
              {gone.map((c) => <CustomerCard key={c.id} customer={c} />)}
            </ul>
          </>
        )}
      </div>
      <div className="dock">
        <AddCustomer />
      </div>
    </div>
  )
}