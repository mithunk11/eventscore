import { createHash, randomBytes } from 'crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1 — misread on paper
const CODE_COUNT = 10

/** Hashed at rest, so a leaked database row is not a working code. */
export function hashCode(code: string) {
  const normalised = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return createHash('sha256').update(normalised).digest('hex')
}

export function generateCodes() {
  const codes: string[] = []
  for (let i = 0; i < CODE_COUNT; i++) {
    const bytes = randomBytes(16)
    let raw = ''
    for (let j = 0; j < 16; j++) raw += ALPHABET[bytes[j] % ALPHABET.length]
    codes.push(raw.match(/.{4}/g)!.join('-'))
  }
  return codes
}
