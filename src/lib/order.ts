/**
 * Sorts entry numbers the way a person would.
 *
 * "2" before "11", because a plain text sort puts 11 first. Names sort
 * alphabetically. Mixtures like A1, A2, A10 sort by their letters then their
 * digits, so A10 comes after A2 rather than before it.
 */
export function compareBib(a: string | null, b: string | null): number {
  const left = (a ?? '').trim()
  const right = (b ?? '').trim()

  if (!left && !right) return 0
  if (!left) return 1          // blanks last
  if (!right) return -1

  const bothNumbers = /^\d+(\.\d+)?$/.test(left) && /^\d+(\.\d+)?$/.test(right)
  if (bothNumbers) return Number(left) - Number(right)

  // Split into runs of digits and non-digits, then compare piece by piece
  const chunk = (s: string) => s.match(/\d+|\D+/g) ?? []
  const l = chunk(left)
  const r = chunk(right)

  for (let i = 0; i < Math.min(l.length, r.length); i++) {
    const lc = l[i]
    const rc = r[i]
    const lNum = /^\d/.test(lc)
    const rNum = /^\d/.test(rc)

    if (lNum && rNum) {
      const diff = Number(lc) - Number(rc)
      if (diff !== 0) return diff
    } else {
      const diff = lc.localeCompare(rc, 'en', { sensitivity: 'base' })
      if (diff !== 0) return diff
    }
  }

  return l.length - r.length
}

/** Same ordering, for anything carrying a bib and a name. */
export function byBib<T extends { bib?: string | null; bib_number?: string | null; name?: string }>(
  a: T, b: T
): number {
  const result = compareBib(a.bib ?? a.bib_number ?? null, b.bib ?? b.bib_number ?? null)
  if (result !== 0) return result
  return (a.name ?? '').localeCompare(b.name ?? '', 'en', { sensitivity: 'base' })
}
