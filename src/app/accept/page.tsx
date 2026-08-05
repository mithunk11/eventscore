import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DOC_VERSION, DOCUMENTS } from '@/lib/legal'
import { AcceptForm } from '@/components/AcceptForm'
import { Brand } from '@/components/Brand'

export default async function AcceptPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: accepted } = await supabase
    .from('acceptances').select('document')
    .eq('profile_id', user.id).eq('version', DOC_VERSION)

  const have = new Set((accepted ?? []).map((a) => a.document))
  if (DOCUMENTS.every((d) => have.has(d))) redirect('/dashboard')

  return (
    <div className="app">
      <div className="spot" />
      <div className="screen" style={{ paddingTop: 60 }}>
        <Brand size={28} />
        <p className="eyebrow" style={{ marginTop: 38 }}>Before you begin</p>
        <h1 className="display d-xl">A few confirmations</h1>
        <p className="sub" style={{ marginBottom: 28 }}>
          You are the data controller for everything you upload. These three
          confirmations record that, and we keep a note of the date and version.
        </p>
        <AcceptForm />
      </div>
    </div>
  )
}
