import { createFileRoute } from '@tanstack/react-router'
import { GeneralError } from '@/pages/errors/GeneralError'

export const Route = createFileRoute('/(errors)/500')({
  component: GeneralError,
})
