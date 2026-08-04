import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { signedUrls } from '@/lib/media'
import { AddContestant } from '@/components/AddContestant'

export default async function ContestantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('name').eq('id', id).single()
  if (!event) notFound()

  const { data: contestants } = await supabase
    .from('contestants').select('*').eq('event_id', id).order('bib_number')

  const photos = await signedUrls(supabase, (contestants ?? []).map((c) => c.photo_url))
  const count = contestants?.length ?? 0

  async function remove(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('contestants').delete().eq('id', formData.get('cid') as string)
    revalidatePath('/events/' + id + '/contestants')
  }

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href={'/events/' + id} aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">Contestants</span>
      </header>

      <div className="screen">
        <p className="eyebrow">{event.name}</p>
        <h1 className="display d-xl" style={{ marginBottom: 24 }}>
          {count} contestant{count === 1 ? '' : 's'}
        </h1>

        {count === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>Nobody added yet</h2>
            <p className="sub">Add everyone competing. Photos help judges keep track on the night.</p>
          </div>
        ) : (
          <ul className="list">
            {contestants!.map((c) => (
              <li key={c.id} className="card">
                <span className="avatar-wrap">
                  {c.photo_url && photos[c.photo_url]
                    ? <img className="avatar" src={photos[c.photo_url]} alt="" />
                    : <span className="thumb">{c.name.slice(0, 1).toUpperCase()}</span>}
                  {c.bib_number && <span className="bib nums">{c.bib_number}</span>}
                </span>
                <span className="card-body">
                  <span className="card-title">{c.name}</span>
                  <span className="card-meta">{c.description ?? 'No description'}</span>
                </span>
                <form action={remove}>
                  <input type="hidden" name="cid" value={c.id} />
                  <button className="trash" type="submit">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dock">
        <AddContestant eventId={id} nextBib={count + 1} />
      </div>
    </div>
  )
}
