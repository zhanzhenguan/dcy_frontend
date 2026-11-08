import { createFileRoute } from '@tanstack/react-router'
import { NotFoundError } from '@/pages/errors/NotFounErro'

export const Route = createFileRoute('/(errors)/404')({
  component: NotFoundError,
})
