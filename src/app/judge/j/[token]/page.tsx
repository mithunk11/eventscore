import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { signedUrls } from '@/lib/media'
import { JudgePinForm } from '@/components/JudgePinForm'
import { Brand } from '@/components/Brand'

export default async function JudgeInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = createAdminClient()

  const { data: judge } = await db
    .from('judges').select('id, name, photo_url, status, event_id')
    .eq('invite_token', token).maybeSingle()
  if (!judge || judge.status !== 'active') notFound()

  const { data: event } = await db.from('events').select('name').eq('id', judge.event_id).maybeSingle()
  const photos = await signedUrls(db, [judge.photo_url])
  const photo = judge.photo_url ? photos[judge.photo_url] ?? null : null

  return (
    <div className="app">
      <div className="spot" />
      <div className="screen" style={{ paddingTop: 70 }}>
        <Brand size={32} />
        <div className="greet">
          {photo
            ? <img className="greet-photo" src={photo} alt="" />
            : <div className="greet-photo greet-blank">
                <svg width="54" height="54" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" fill="currentColor" />
                  <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
                </svg>
              </div>}
          <p className="eyebrow" style={{ marginTop: 20 }}>{event?.name ?? 'Your event'}</p>
          <h1 className="display d-xl">{judge.name}</h1>
          <p className="sub">Enter your PIN to open your scorecard.</p>
        </div>
        <JudgePinForm inviteToken={token} />
      </div>
    </div>
  )
}
