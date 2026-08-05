/**
 * Bump this whenever the Terms, Privacy Policy or DPA change materially.
 * Customers are asked to accept again, and the record of which version they
 * accepted is what protects you in a dispute.
 */
export const DOC_VERSION = '1.0'

export const DOCUMENTS = ['terms', 'age', 'consent'] as const
export type DocumentKey = (typeof DOCUMENTS)[number]
