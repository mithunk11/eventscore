export type Section = {
  h: string
  p?: string[]
  list?: string[]
  table?: { head: string[]; rows: string[][] }
}

export type LegalDoc = {
  title: string
  updated: string
  sections: Section[]
}
