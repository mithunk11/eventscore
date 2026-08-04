import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Brand } from '@/components/Brand'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase
    .from('events').select('*').order('created_at', { ascending: false })

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <Brand />
        <span style={{ flex: 1 }} />
        <form action={signOut}><button className="btn btn-quiet" type="submit">Sign out</button></form>
      </header>

      <div className="screen">
        <p className="eyebrow">On the bill</p>
        <h1 className="display d-xl" style={{ marginBottom: 24 }}>Your events</h1>

        {!events || events.length === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>Nothing scheduled</h2>
            <p className="sub">Set up your first event, add contestants, and invite judges by QR or PIN.</p>
          </div>
        ) : (
          <ul className="list">
            {events.map((event) => (
              <li key={event.id}>
                <a className="card" href={'/events/' + event.id}>
                  <span className="thumb">{event.name.slice(0, 1).toUpperCase()}</span>
                  <span className="card-body">
                    <span className="card-title">{event.name}</span>
                    <span className="card-meta nums">{event.event_date ?? 'No date'} &middot; {event.status}</span>
                  </span>
                  <span className="chev">&rsaquo;</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dock">
        <a className="btn btn-amber btn-full" href="/events/new">New event</a>
      </div>
    </div>
  )
}
