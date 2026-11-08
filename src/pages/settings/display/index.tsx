import { ContentSection } from '../components/ContentSection'
import { DisplayForm } from './DisplayForm'

export const SettingsDisplay = () => {
  return (
    <ContentSection
      title='Display'
      desc="Turn items on or off to control what's displayed in the app."
    >
      <DisplayForm />
    </ContentSection>
  )
}
