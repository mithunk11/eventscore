import type { Metadata } from 'next'
import { Fraunces, Archivo } from 'next/font/google'
import './globals.css'

const display = Fraunces({ subsets: ['latin'], variable: '--font-display' })
const body = Archivo({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'EventScore',
  description: 'Scoring for live competitions, without the paperwork.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
