import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase.from('events').select('*')

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">EventScore</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <form action={signOut}>
          <button className="text-sm text-gray-500 hover:text-gray-900">
            Sign out
          </button>
        </form>
      </div>

      <h2 className="mb-4 text-lg font-medium">Your events</h2>

      {!events || events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="mb-1 text-gray-900">No events yet</p>
          <p className="text-sm text-gray-500">
            Create your first event to get started.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li key={event.id} className="rounded-xl border border-gray-200 p-4">
              {event.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}