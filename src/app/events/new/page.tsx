'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewEventPage() {
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [venue, setVenue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Not signed in.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('events').insert({
      owner_id: user.id,
      name,
      event_date: eventDate || null,
      venue: venue || null,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-1 text-2xl font-medium">New event</h1>
      <p className="mb-8 text-sm text-gray-500">
        You can change any of this later.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1 block text-sm text-gray-700">Event name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Miss Galway 2026"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">Date</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">Venue</label>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-white disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create event'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-3 text-sm text-gray-500 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}