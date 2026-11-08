import { createFileRoute } from '@tanstack/react-router'
import { MaintenanceError } from '@/pages/errors/MainError'

export const Route = createFileRoute('/(errors)/503')({
  component: MaintenanceError,
})
