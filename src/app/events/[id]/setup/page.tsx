import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signedUrls } from '@/lib/media'
import { compareBib } from '@/lib/order'
import { WizardFrame } from '@/components/wizard/WizardFrame'
import { StepBasics, StepRounds, StepCategories, StepSettings } from '@/components/wizard/Steps'
import { AddContestant } from '@/components/AddContestant'
import { AddJudge } from '@/components/AddJudge'
import { AddedList } from '@/components/wizard/AddedList'

export const dynamic = 'force-dynamic'

export default async function SetupPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ step?: string }>
}) {
  const { id } = await params
  const { step: stepParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: rounds } = await supabase
    .from('rounds').select('id, name, position, advance_count')
    .eq('event_id', id).order('position')

  const { data: cats } = await supabase
    .from('categories').select('id, name, max_score, round_id, position')
    .in('round_id', (rounds ?? []).map((r) => r.id)).order('position')

  const { data: contestants } = await supabase
    .from('contestants').select('id, name, bib_number, photo_url').eq('event_id', id)

  const { data: judges } = await supabase
    .from('judges').select('id, name, pin, position').eq('event_id', id).order('position')

  // Where to open if no step was asked for: the first thing still missing
  let step = stepParam ? Number(stepParam) : -1
  if (step < 0) {
    if (!rounds?.length) step = 1
    else if ((cats ?? []).length === 0) step = 2
    else if (!contestants?.length) step = 3
    else if (!judges?.length) step = 4
    else step = 6
  }
  step = Math.max(0, Math.min(6, step))

  const roundsWithCats = (rounds ?? []).map((r) => ({
    ...r,
    categories: (cats ?? []).filter((c) => c.round_id === r.id)
      .map((c) => ({ id: c.id, name: c.name, max_score: Number(c.max_score) })),
  }))

  const sortedContestants = [...(contestants ?? [])]
    .sort((a, b) => compareBib(a.bib_number, b.bib_number))

  if (step === 0) {
    return (
      <WizardFrame eventId={id} step={0} title="The event"
        blurb="The basics. You can change any of this later.">
        <StepBasics eventId={id} event={event} />
      </WizardFrame>
    )
  }

  if (step === 1) {
    return (
      <WizardFrame eventId={id} step={1} title="Rounds"
        blurb="A round is a stage of the competition. Say how many contestants go through from each, and mark the last one as the end.">
        <StepRounds eventId={id} rounds={rounds ?? []} />
      </WizardFrame>
    )
  }

  if (step === 2) {
    return (
      <WizardFrame eventId={id} step={2} title="What gets marked"
        blurb="Add each thing judges score in a round, and the highest mark they can give for it.">
        <StepCategories eventId={id} rounds={roundsWithCats} />
      </WizardFrame>
    )
  }

  if (step === 3) {
    const photos = await signedUrls(supabase, sortedContestants.map((c) => c.photo_url))
    return (
      <WizardFrame eventId={id} step={3} title="Contestants"
        blurb="Everyone competing. Photographs help judges enormously on the night.">
        <AddedList eventId={id} table="contestants"
          items={sortedContestants.map((c) => ({
            id: c.id,
            primary: (c.bib_number ? c.bib_number + ' — ' : '') + c.name,
            secondary: c.photo_url && photos[c.photo_url] ? 'Photograph added' : 'No photograph',
          }))}
          empty="Nobody added yet." />

        <div className="wiz-form">
          <AddContestant eventId={id} nextBib={(contestants?.length ?? 0) + 1} />
        </div>
      </WizardFrame>
    )
  }

  if (step === 4) {
    return (
      <WizardFrame eventId={id} step={4} title="Judges"
        blurb="Each judge gets their own link and PIN. The one at the top settles any tie the panel cannot.">
        <AddedList eventId={id} table="judges"
          items={(judges ?? []).map((j, i) => ({
            id: j.id,
            primary: j.name,
            secondary: 'PIN ' + (j.pin ?? '----') + (i === 0 ? ' · head judge' : ''),
          }))}
          empty="No judges yet." />

        <div className="wiz-form">
          <AddJudge eventId={id} nextPosition={(judges?.length ?? 0) + 1} />
        </div>
      </WizardFrame>
    )
  }

  if (step === 5) {
    return (
      <WizardFrame eventId={id} step={5} title="Options"
        blurb="How judges work, and how long the data is kept.">
        <StepSettings eventId={id} event={event} />
      </WizardFrame>
    )
  }

  // Step 7: the review
  const missingCats = roundsWithCats.filter((r) => r.categories.length === 0)
  const hasFinal = (rounds ?? []).some((r) => !r.advance_count)

  const checks = [
    { ok: Boolean(event.name), text: 'Event named', fix: 0 },
    { ok: (rounds?.length ?? 0) > 0, text: (rounds?.length ?? 0) + ' round' + (rounds?.length === 1 ? '' : 's'), fix: 1 },
    { ok: hasFinal && (rounds?.length ?? 0) > 0, text: 'One round ends the event', fix: 1 },
    { ok: missingCats.length === 0 && (rounds?.length ?? 0) > 0,
      text: missingCats.length ? missingCats.map((r) => r.name).join(', ') + ' still needs categories' : 'Every round has categories',
      fix: 2 },
    { ok: (contestants?.length ?? 0) > 0, text: (contestants?.length ?? 0) + ' contestants', fix: 3 },
    { ok: (judges?.length ?? 0) > 0, text: (judges?.length ?? 0) + ' judge' + (judges?.length === 1 ? '' : 's'), fix: 4 },
  ]

  const ready = checks.every((c) => c.ok)

  return (
    <WizardFrame eventId={id} step={6}
      title={ready ? 'Ready to run' : 'Almost there'}
      blurb={ready
        ? 'Everything is in place. Send the judges their links when you are ready.'
        : 'These still need attention before judges can score.'}>
      <ul className="list">
        {checks.map((c, i) => (
          <li key={i}>
            <a className="step" href={'/events/' + id + '/setup?step=' + c.fix}>
              <span className={c.ok ? 'dot dot-done' : 'dot'}>{c.ok ? '\u2713' : ''}</span>
              <span className="card-body">
                <span className="card-title d-m">{c.text}</span>
              </span>
              {!c.ok && <span className="chev">&rsaquo;</span>}
            </a>
          </li>
        ))}
      </ul>

      <p className="sub" style={{ marginTop: 22 }}>
        The event code is <strong className="nums">{event.code}</strong>. Judges can
        use it with their PIN if a link will not open.
      </p>
    </WizardFrame>
  )
}
