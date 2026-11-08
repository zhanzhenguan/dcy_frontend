import { ContentSection } from '../components/ContentSection'
import { AppearanceForm } from './AppeForm'

export const SettingsAppearance = () => {
  return (
    <ContentSection
      title='Appearance'
      desc='Customize the appearance of the app. Automatically switch between day
          and night themes.'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
