import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CustomerCard } from '@/components/CustomerCard'
import { AddCustomer } from '@/components/AddCustomer'
import { Brand } from '@/components/Brand'

export const dynamic = 'force-dynamic'

export default async function BackstagePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const view = tab === 'owners' ? 'owners' : tab === 'archive' ? 'archive' : 'customers'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'owner') redirect('/dashboard')

  const { data: rows } = await supabase
    .from('profiles').select('*').order('created_at', { ascending: false })

  // Counts only. No query here reaches event names, contestants or scores,
  // and no policy would allow one.
  const all = []
  for (const c of rows ?? []) {
    const { data: n } = await supabase.rpc('customer_event_count', { p_owner: c.id })
    all.push({
      id: c.id, email: c.email, org_name: c.org_name,
      access: (c.access ?? 'full') as 'full' | 'readonly' | 'disabled',
      status: c.status ?? 'active',
      deleted_at: c.deleted_at,
      max_active_events: c.max_active_events ?? 1,
      max_contestants: c.max_contestants ?? 30,
      max_judges: c.max_judges ?? 5,
      eventCount: Number(n ?? 0),
      adminUntil: c.admin_access_until,
      backupEmail: c.backup_email ?? null,
      role: (c.role ?? 'customer') as 'owner' | 'customer',
      isOnlyOwner: false,
    })
  }

  const ownerCount = all.filter((c) => c.role === 'owner' && c.status !== 'deleted').length
  all.forEach((c) => { c.isOnlyOwner = c.role === 'owner' && ownerCount <= 1 })

  const live = all.filter((c) => c.status !== 'deleted')
  const customers = live.filter((c) => c.role === 'customer')
  const owners = live.filter((c) => c.role === 'owner')
  const archive = all.filter((c) => c.status === 'deleted')

  const showing = view === 'owners' ? owners : view === 'archive' ? archive : customers

  const blurb = {
    customers: 'Organisations running their own events. Set what each may create.',
    owners: 'Full access to every account, including yours. Add sparingly.',
    archive: 'Deleted accounts, purged automatically after 30 days.',
  }[view]

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <Brand />
        <span style={{ flex: 1 }} />
        <a className="btn btn-quiet" href="/backstage/enquiries">Enquiries</a>
        <a className="btn btn-quiet" href="/backstage/acceptances">Agreements</a>
        <a className="btn btn-quiet" href="/dashboard">Events</a>
      </header>

      <div className="screen">
        <p className="eyebrow">Owner console</p>
        <h1 className="display d-xl" style={{ marginBottom: 20 }}>Accounts</h1>

        <nav className="tabs">
          <a className={view === 'customers' ? 'tab tab-on' : 'tab'} href="/backstage">
            Customers <span className="tab-n nums">{customers.length}</span>
          </a>
          <a className={view === 'owners' ? 'tab tab-on' : 'tab'} href="/backstage?tab=owners">
            Owners <span className="tab-n nums">{owners.length}</span>
          </a>
          <a className={view === 'archive' ? 'tab tab-on' : 'tab'} href="/backstage?tab=archive">
            Archive <span className="tab-n nums">{archive.length}</span>
          </a>
        </nav>

        <p className="sub" style={{ marginTop: 0, marginBottom: 22 }}>{blurb}</p>

        {view === 'owners' && owners.length > 1 && (
          <p className="alert">
            Every owner can reset your password and demote you. There is no seniority
            between owners.
          </p>
        )}

        {showing.length === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>
              {view === 'archive' ? 'Nothing archived' : view === 'owners' ? 'Just you' : 'No customers yet'}
            </h2>
            <p className="sub">
              {view === 'archive'
                ? 'Deleted accounts appear here for 30 days before being purged.'
                : view === 'owners'
                  ? 'Add a second owner so someone can reset your password if you are locked out.'
                  : 'Add your first customer below.'}
            </p>
          </div>
        ) : (
          <ul className="list">
            {showing.map((c) => <CustomerCard key={c.id} customer={c} />)}
          </ul>
        )}
      </div>

      {view !== 'archive' && (
        <div className="dock">
          <AddCustomer />
        </div>
      )}
    </div>
  )
}
