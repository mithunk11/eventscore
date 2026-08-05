'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DOC_VERSION, DOCUMENTS } from '@/lib/legal'

export async function acceptTerms(_prev: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  for (const doc of DOCUMENTS) {
    if (formData.get(doc) !== 'on') {
      return { error: 'All three need to be confirmed before you can continue.' }
    }
  }

  const rows = DOCUMENTS.map((doc) => ({
    profile_id: user.id, document: doc, version: DOC_VERSION,
  }))

  const { error } = await supabase.from('acceptances').insert(rows)
  if (error) return { error: error.message }

  redirect('/dashboard')
}
