import { LegalPage } from '@/components/LegalPage'
import { TERMS } from '@/lib/legal/terms'

export const metadata = { title: 'Terms of Service - EventScore' }

export default function TermsRoute() {
  return <LegalPage doc={TERMS} />
}
