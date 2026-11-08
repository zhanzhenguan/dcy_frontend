import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { PortalFooter, PortalHeader } from '@/components/common'
import { scrollToSection } from '@/utils/scrollToSection'
import '../portal.scss'
import './home.scss'
import { AboutSection } from './components/AboutSection'
import { AdvantagesSection } from './components/AdvantagesSection'
import { ContactSection } from './components/ContactSection'
import { HomeBanner } from './components/HomeBanner'
import { LeadershipSection } from './components/LeadershipSection'
import { PricingSection } from './components/PricingSection'
import { ServicesSection } from './components/ServicesSection'

function useScrollToHash() {
  const hash = useRouterState({ select: (s) => s.location.hash })

  useEffect(() => {
    const id = hash.replace(/^#/, '')
    if (!id) return

    const timer = window.setTimeout(() => {
      scrollToSection(id)
    }, 80)
    return () => window.clearTimeout(timer)
  }, [hash])
}

export const HomePage = () => {
  useScrollToHash()

  return (
    <div className='analytics-portal relative min-h-svh text-[var(--portal-text)]'>
      <PortalHeader />
      <HomeBanner />
      <LeadershipSection />
      <AboutSection />
      <ServicesSection />
      <PricingSection />
      <AdvantagesSection />
      <ContactSection />
      <PortalFooter />
    </div>
  )
}

export default HomePage
