import { PortalFooter, PortalHeader } from '@/components/common'
import '../portal.scss'
import './terms.scss'
import { TermsSection } from './components/TermsSection'

export const TermsPage = () => {
  return (
    <div className='analytics-portal relative min-h-svh text-[var(--portal-text)]'>
      <PortalHeader />
      <main className='relative z-0 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20'>
        <div className='mx-auto max-w-4xl'>
          <TermsSection />
        </div>
      </main>
      <PortalFooter />
    </div>
  )
}

export default TermsPage
