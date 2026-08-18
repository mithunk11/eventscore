export type QueuedMark = {
  entryId: string
  categoryId: string
  value: number
  at: number
}

const KEY = 'es_pending_marks'

/**
 * Marks waiting to reach the server.
 *
 * Held in localStorage so they survive a page reload, a phone locking, or the
 * browser deciding to discard a background tab. Keyed by entry and category so
 * a judge changing their mind about the same category only ever queues once.
 *
 * localStorage is used rather than IndexedDB because the payload is tiny and
 * synchronous access means nothing is lost if the page is closing.
 */
export function readQueue(): Record<string, QueuedMark> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, QueuedMark>) : {}
  } catch {
    return {}
  }
}

function writeQueue(q: Record<string, QueuedMark>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(q))
  } catch {
    // Storage full or blocked. The in-memory copy still works for this session.
  }
}

export function queueMark(m: Omit<QueuedMark, 'at'>) {
  const q = readQueue()
  q[m.entryId + '|' + m.categoryId] = { ...m, at: Date.now() }
  writeQueue(q)
  return Object.keys(q).length
}

export function pendingMarks(): QueuedMark[] {
  return Object.values(readQueue()).sort((a, b) => a.at - b.at)
}

export function pendingCount() {
  return Object.keys(readQueue()).length
}

/** Removes only what was actually confirmed, so a partial failure keeps the rest. */
export function clearSent(sent: { entryId: string; categoryId: string }[]) {
  const q = readQueue()
  for (const m of sent) delete q[m.entryId + '|' + m.categoryId]
  writeQueue(q)
  return Object.keys(q).length
}

export function clearAll() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // nothing to do
  }
}
