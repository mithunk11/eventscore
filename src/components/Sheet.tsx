'use client'

import { useEffect } from 'react'

export function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  // Escape closes it, and the page behind must not scroll while it is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        <div className="grab" />
        {children}
      </div>
    </>
  )
}
