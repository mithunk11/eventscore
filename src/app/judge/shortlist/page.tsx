import { redirect } from 'next/navigation'
import { getJudgeSession } from '@/lib/judge-session'
import { ensureRoster } from '@/lib/scoring'
import { signedUrls } from '@/lib/media'
import { signOutJudge } from '../actions'

/** Between rounds: the judge reads this list out to announce who is through. */
export default async function ShortlistPage() {
  const session = await getJudgeSession()
  if (!session) redirect('/judge')
  const { judge, event, db } = session

  const { data: rounds } = await db
    .from('rounds').select('*').eq('event_id', event.id).order('position')
  if (!rounds?.length) redirect('/judge/score')

  const { data: subs } = await db.from('submissions').select('round_id').eq('judge_id', judge.id)
  const mine = new Set((subs ?? []).map((s) => s.round_id))

  const current = rounds.find((r) => !mine.has(r.id))
  if (!current || current.position === 1) redirect('/judge/score')

  await ensureRoster(db, current.id)

  const { data: entries } = await db
    .from('entries').select('id, contestants(name, bib_number, photo_url)').eq('round_id', current.id)

  const people = (entries ?? []).map((e) => {
    const c = e.contestants as unknown as { name: string; bib_number: string | null; photo_url: string | null }
    return { id: e.id, name: c.name, bib: c.bib_number, photo: c.photo_url }
  }).sort((a, b) => Number(a.bib ?? 0) - Number(b.bib ?? 0))

  const photos = await signedUrls(db, people.map((p) => p.photo))

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <span className="topbar-title">{judge.name}</span>
        <form action={signOutJudge}><button className="btn btn-quiet" type="submit">Leave</button></form>
      </header>

      <div className="screen">
        <p className="eyebrow nums">Round {String(current.position).padStart(2, '0')} &middot; {current.name}</p>
        <h1 className="display d-xl">Through to this round</h1>
        <p className="sub" style={{ marginBottom: 24 }}>
          {people.length} contestant{people.length === 1 ? '' : 's'}. Read the list out, then begin scoring.
        </p>

        <ul className="list">
          {people.map((p) => (
            <li key={p.id} className="card">
              <span className="avatar-wrap">
                {p.photo && photos[p.photo]
                  ? <img className="avatar" src={photos[p.photo]} alt="" />
                  : <span className="thumb">{p.name.slice(0, 1).toUpperCase()}</span>}
                {p.bib && <span className="bib nums">{p.bib}</span>}
              </span>
              <span className="card-body"><span className="card-title">{p.name}</span></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="dock">
        <a className="btn btn-amber btn-full" href="/judge/score">Begin {current.name}</a>
      </div>
    </div>
  )
}
