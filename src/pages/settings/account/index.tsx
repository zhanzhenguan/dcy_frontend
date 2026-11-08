import { ContentSection } from '../components/ContentSection'
import { AccountForm } from './AccountForm'

export const SettingsAccount = () => {
  return (
    <ContentSection
      title='Account'
      desc='Update your account settings. Set your preferred language and
          timezone.'
    >
      <AccountForm />
    </ContentSection>
  )
}
