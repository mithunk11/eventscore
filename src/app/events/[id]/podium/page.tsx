import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { roundStandings } from '@/lib/scoring'
import { signedUrls } from '@/lib/media'

export const dynamic = 'force-dynamic'

/** Stage mode: full bleed, meant to be thrown on a projector. */
export default async function PodiumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: rounds } = await supabase
    .from('rounds').select('*').eq('event_id', id).order('position', { ascending: false })
  const final = rounds?.find((r) => !r.advance_count) ?? rounds?.[0]
  if (!final) notFound()

  const standings = await roundStandings(supabase, final.id)
  const photos = await signedUrls(supabase, standings.map((s) => s.photo))

  const winners = standings.filter((s) => s.judgesIn > 0).slice(0, event.winners_count ?? 3)
  const order = winners.length >= 3 ? [1, 0, 2] : winners.map((_, i) => i)

  return (
    <div className="stagemode">
      <div className="spot" />
      <a className="stage-exit" href={'/events/' + id + '/live'}>Close</a>

      <div className="stage-inner">
        <p className="eyebrow">{event.name}</p>
        <h1 className="display stage-title">{final.name}</h1>

        {winners.length === 0 ? (
          <p className="sub">Results appear once judges submit the final round.</p>
        ) : (
          <div className="bigpodium">
            {order.map((pos, n) => {
              const w = winners[pos]
              if (!w) return null
              return (
                <div key={w.entryId} className={'bigplinth bigplinth-' + (pos + 1)}
                  style={{ animationDelay: (n * 0.5) + 's' }}>
                  {w.photo && photos[w.photo]
                    ? <img className="bigphoto" src={photos[w.photo]} alt="" />
                    : <div className="bigphoto bigblank">{w.name.slice(0, 1).toUpperCase()}</div>}
                  <span className="bigplace nums">{pos + 1}</span>
                  <span className="bigname">{w.name}</span>
                  {w.bib && <span className="bigbib nums">Chest {w.bib}</span>}
                  {event.show_scores && <span className="bigscore nums">{w.score.toFixed(1)}%</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
