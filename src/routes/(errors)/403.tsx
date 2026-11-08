import { createFileRoute } from '@tanstack/react-router'
import { ForbiddenError } from '@/pages/errors/forb'

export const Route = createFileRoute('/(errors)/403')({
  component: ForbiddenError,
})
