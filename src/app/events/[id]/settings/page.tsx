import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventSettings } from '@/components/EventSettings'
import { EventLogo } from '@/components/EventLogo'
import { signedUrls } from '@/lib/media'

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const photos = await signedUrls(supabase, [event.logo_url])

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href={'/events/' + id} aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">Settings</span>
      </header>

      <div className="screen">
        <p className="eyebrow">{event.name}</p>
        <h1 className="display d-xl" style={{ marginBottom: 28 }}>Settings</h1>
        <section className="sec-block">
          <h2 className="display d-l" style={{ marginBottom: 12 }}>Your logo</h2>
          <EventLogo eventId={id} current={event.logo_url ? photos[event.logo_url] ?? null : null} />
        </section>

        <EventSettings event={event} />
      </div>
    </div>
  )
}
