import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { signedUrls } from '@/lib/media'
import { AddJudge } from '@/components/AddJudge'

export default async function JudgesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('name, code').eq('id', id).single()
  if (!event) notFound()

  const { data: judges } = await supabase
    .from('judges').select('*').eq('event_id', id).order('position')

  const photos = await signedUrls(supabase, (judges ?? []).map((j) => j.photo_url))
  const count = judges?.length ?? 0

  async function remove(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('judges').delete().eq('id', formData.get('jid') as string)
    revalidatePath('/events/' + id + '/judges')
  }

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href={'/events/' + id} aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">Judges</span>
      </header>

      <div className="screen">
        <p className="eyebrow">{event.name}</p>
        <h1 className="display d-xl">The panel</h1>

        <div className="pin-strip">
          <span>
            <span className="label" style={{ marginBottom: 2 }}>Event code</span>
            <span className="code-value nums">{event.code ?? 'Not set'}</span>
          </span>
          <span className="sub" style={{ margin: 0, textAlign: 'right', maxWidth: 150 }}>
            Judges enter this with their own PIN
          </span>
        </div>

        {count === 0 ? (
          <div className="empty" style={{ marginTop: 24 }}>
            <h2 className="display d-l" style={{ marginBottom: 8 }}>No judges yet</h2>
            <p className="sub">Add each judge. The first one becomes head judge for tie decisions.</p>
          </div>
        ) : (
          <ul className="list" style={{ marginTop: 24 }}>
            {judges!.map((j) => (
              <li key={j.id} className="card">
                <span className="avatar-wrap">
                  {j.photo_url && photos[j.photo_url]
                    ? <img className="avatar" src={photos[j.photo_url]} alt="" />
                    : <span className="thumb">{j.name.slice(0, 1).toUpperCase()}</span>}
                </span>
                <span className="card-body">
                  <span className="card-title">{j.name}</span>
                  <span className="card-meta nums">
                    PIN {j.pin ?? '----'}{j.position === 1 ? ' \u00B7 Head judge' : ''}
                  </span>
                </span>
                <form action={remove}>
                  <input type="hidden" name="jid" value={j.id} />
                  <button className="trash" type="submit">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dock">
        <AddJudge eventId={id} nextPosition={count + 1} />
      </div>
    </div>
  )
}
