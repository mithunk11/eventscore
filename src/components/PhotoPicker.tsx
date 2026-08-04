'use client'

import { useRef, useState } from 'react'

export function PhotoPicker({ onPick, initial }: { onPick: (file: File | null) => void; initial?: string }) {
  const [preview, setPreview] = useState<string | null>(initial ?? null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onPick(file)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  return (
    <div className="picker">
      <button type="button" className="picker-target" onClick={() => inputRef.current?.click()}>
        {preview
          ? <img src={preview} alt="" className="picker-img" />
          : <span>Add<br />photo</span>}
      </button>
      <div>
        <button type="button" className="btn btn-ghost" style={{ minHeight: 40, padding: '0 16px', fontSize: 13 }} onClick={() => inputRef.current?.click()}>
          {preview ? 'Change photo' : 'Choose photo'}
        </button>
        {preview && (
          <button type="button" className="btn btn-quiet" style={{ display: 'block', marginTop: 4 }} onClick={() => { onPick(null); setPreview(null); if (inputRef.current) inputRef.current.value = '' }}>
            Remove
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handle} />
    </div>
  )
}
