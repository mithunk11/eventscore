import { LegalPage } from '@/components/LegalPage'
import { DPA } from '@/lib/legal/dpa'

export const metadata = { title: 'Data Processing Agreement - EventScore' }

export default function DpaRoute() {
  return <LegalPage doc={DPA} />
}
