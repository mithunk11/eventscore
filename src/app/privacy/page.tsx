import { LegalPage } from '@/components/LegalPage'
import { PRIVACY } from '@/lib/legal/privacy'

export const metadata = { title: 'Privacy Policy - EventScore' }

export default function PrivacyRoute() {
  return <LegalPage doc={PRIVACY} />
}
