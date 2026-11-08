import { PortalFooter, PortalHeader } from '@/components/common'
import '../portal.scss'
import './privacy.scss'
import { PrivacySection } from './components/PrivacySection'

export const PrivacyPage = () => {
  return (
    <div className='analytics-portal relative min-h-svh text-[var(--portal-text)]'>
      <PortalHeader />
      <main className='relative z-0 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20'>
        <div className='mx-auto max-w-4xl'>
          <PrivacySection />
        </div>
      </main>
      <PortalFooter />
    </div>
  )
}

export default PrivacyPage
