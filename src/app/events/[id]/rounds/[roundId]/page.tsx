import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { AddCategory } from '@/components/AddCategory'
import { EditRound } from '@/components/EditRound'
import { EditCategory } from '@/components/EditCategory'

export default async function RoundPage({ params }: { params: Promise<{ id: string; roundId: string }> }) {
  const { id, roundId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: round } = await supabase.from('rounds').select('*').eq('id', roundId).single()
  if (!round) notFound()

  const { data: categories } = await supabase
    .from('categories').select('*').eq('round_id', roundId).order('position')

  const { data: roundEntries } = await supabase
    .from('entries').select('id').eq('round_id', roundId)
  let locked = false
  if (roundEntries?.length) {
    const { count } = await supabase
      .from('scores').select('id', { count: 'exact', head: true })
      .in('entry_id', roundEntries.map((e) => e.id))
    locked = (count ?? 0) > 0
  }

  const { count: roundCount } = await supabase
    .from('rounds').select('id', { count: 'exact', head: true }).eq('event_id', id)

  const isFinal = !round.advance_count

  async function removeCategory(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('categories').delete().eq('id', formData.get('categoryId') as string)
    revalidatePath('/events/' + id + '/rounds/' + roundId)
  }

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href={'/events/' + id} aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">{round.name}</span>
      </header>

      <div className="screen">
        <p className="eyebrow nums">Round {String(round.position).padStart(2, '0')}</p>
        <h1 className="display d-xl">{round.name}</h1>
        <p className="sub" style={{ marginBottom: 30 }}>
          {isFinal ? 'This round decides the winners.' : 'The top ' + round.advance_count + ' go through.'}
        </p>

        <div style={{ marginBottom: 26 }}>
          <EditRound eventId={id} roundId={roundId} name={round.name}
            advanceCount={round.advance_count} locked={locked}
            roundCount={roundCount ?? 1} />
        </div>

        <ul className="list" style={{ marginBottom: 26 }}>
          <li>
            <a className="step" href={'/events/' + id + '/rounds/' + roundId + '/outcome'}>
              <span className="dot dot-done">&#9679;</span>
              <span className="card-body">
                <span className="card-title d-m">Round result</span>
                <span className="card-meta">Who went through, who did not, with marks</span>
              </span>
              <span className="chev">&rsaquo;</span>
            </a>
          </li>
        </ul>

        <p className="eyebrow">What gets marked</p>

        {!categories || categories.length === 0 ? (
          <div className="empty">
            <h2 className="display d-l" style={{ marginBottom: 8 }}>No categories yet</h2>
            <p className="sub">Add each thing judges score, and the highest mark they can give.</p>
          </div>
        ) : (
          <>
            <ul className="list">
              {categories.map((c) => (
                <li key={c.id} className="slab">
                  <span className="slab-name">{c.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="mark nums">{c.max_score}<small> max</small></span>
                    {!locked && (
                      <EditCategory eventId={id} roundId={roundId} categoryId={c.id}
                        name={c.name} maxScore={Number(c.max_score)} />
                    )}
                    {!locked && (
                      <form action={removeCategory}>
                        <input type="hidden" name="categoryId" value={c.id} />
                        <button className="trash" type="submit">Remove</button>
                      </form>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="total">
              <span className="eyebrow" style={{ margin: 0 }}>Max from one judge</span>
              <span className="total-value nums">
                {categories.reduce((s, c) => s + Number(c.max_score), 0)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="dock">
        <AddCategory roundId={roundId} nextPosition={(categories?.length ?? 0) + 1} />
      </div>
    </div>
  )
}
