import type { SupabaseClient } from '@supabase/supabase-js'

/** Photos live in a private bucket. Nothing is served without a short-lived signed URL. */
export async function signedUrls(supabase: SupabaseClient, paths: (string | null)[]) {
  const valid = paths.filter((p): p is string => Boolean(p))
  const map: Record<string, string> = {}
  if (valid.length === 0) return map

  const { data } = await supabase.storage.from('event-media').createSignedUrls(valid, 3600)
  data?.forEach((d) => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl })
  return map
}
