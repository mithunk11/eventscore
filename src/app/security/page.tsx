import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TwoFactorSetup } from '@/components/TwoFactorSetup'
import { RecoveryCodes } from '@/components/RecoveryCodes'
import { BackupEmail } from '@/components/BackupEmail'

export const dynamic = 'force-dynamic'

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ recovered?: string }>
}) {
  const { recovered } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totp = factors?.totp ?? []

  const { data: profile } = await supabase
    .from('profiles').select('backup_email').eq('id', user.id).maybeSingle()

  const { count: remaining } = await supabase
    .from('recovery_codes').select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id).is('used_at', null)

  return (
    <div className="app">
      <div className="spot" />
      <header className="topbar">
        <a className="back" href="/dashboard" aria-label="Back">&lsaquo;</a>
        <span className="topbar-title">Security</span>
      </header>

      <div className="screen">
        <p className="eyebrow">{user.email}</p>
        <h1 className="display d-xl" style={{ marginBottom: 24 }}>Your account</h1>

        {recovered && (
          <div className="ok-note">
            You are back in, and two-factor has been switched off. Set it up again
            below on your new device.
          </div>
        )}

        <section className="sec-block">
          <h2 className="display d-l" style={{ marginBottom: 12 }}>Two-factor</h2>
          <TwoFactorSetup existing={totp.map((f) => ({ id: f.id, friendly_name: f.friendly_name, status: f.status }))} />
        </section>

        <section className="sec-block">
          <h2 className="display d-l" style={{ marginBottom: 12 }}>Recovery codes</h2>
          <RecoveryCodes remaining={remaining ?? 0} email={user.email ?? ''} />
        </section>

        <section className="sec-block">
          <h2 className="display d-l" style={{ marginBottom: 12 }}>Backup email</h2>
          <BackupEmail current={profile?.backup_email ?? null} />
        </section>
      </div>
    </div>
  )
}
