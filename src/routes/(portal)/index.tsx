import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/pages/portal/home'

export const Route = createFileRoute('/(portal)/')({
  component: HomePage,
})
