'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { saveMarks } from '@/app/judge/actions'
import { queueMark, pendingMarks, pendingCount, clearSent } from '@/lib/markqueue'

export type SyncState = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

/**
 * Holds marks locally and sends them when it can.
 *
 * The judge never waits on the network. A mark is queued immediately, the
 * screen updates, and the queue drains in the background. If the connection
 * drops, marks pile up safely and go the moment it returns.
 */
export function useMarkSync() {
  const [state, setState] = useState<SyncState>('idle')
  const [waiting, setWaiting] = useState(0)

  const flushing = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retry = useRef(0)

  const flush = useCallback(async () => {
    if (flushing.current) return
    const rows = pendingMarks()
    if (rows.length === 0) {
      setState('idle')
      return
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setState('offline')
      setWaiting(rows.length)
      return
    }

    flushing.current = true
    setState('saving')

    try {
      const payload = rows.map((r) => ({
        entryId: r.entryId,
        categoryId: r.categoryId,
        value: r.value,
      }))

      const res = await saveMarks(payload)

      if (res?.error) {
        setState('error')
        retry.current = Math.min(retry.current + 1, 6)
      } else {
        const left = clearSent(payload)
        setWaiting(left)
        retry.current = 0
        setState(left > 0 ? 'saving' : 'saved')
        if (left === 0) setTimeout(() => setState('idle'), 1800)
      }
    } catch {
      // A thrown error here is almost always the connection going away
      setState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error')
      retry.current = Math.min(retry.current + 1, 6)
      setWaiting(pendingCount())
    } finally {
      flushing.current = false

      // Back off on repeated failure: 2s, 4s, 8s, up to about a minute
      if (retry.current > 0) {
        const delay = Math.min(2000 * 2 ** (retry.current - 1), 60000)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => { void flush() }, delay)
      }
    }
  }, [])

  /** Queue a mark and start a short timer, so a slider drag sends once. */
  const record = useCallback((entryId: string, categoryId: string, value: number) => {
    const n = queueMark({ entryId, categoryId, value })
    setWaiting(n)
    setState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saving')

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, 600)
  }, [flush])

  /** Send everything now and wait. Used before submitting a round. */
  const flushNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    await flush()
    return pendingCount()
  }, [flush])

  // Anything left from a previous session goes as soon as we load
  useEffect(() => {
    const n = pendingCount()
    if (n > 0) {
      setWaiting(n)
      void flush()
    }
  }, [flush])

  // React to the connection coming back
  useEffect(() => {
    const online = () => { retry.current = 0; void flush() }
    const offline = () => setState('offline')
    const visible = () => { if (!document.hidden) void flush() }

    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', visible)

    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', visible)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [flush])

  // Warn if the tab is closing with marks still queued
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingCount() > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  return { state, waiting, record, flushNow }
}
