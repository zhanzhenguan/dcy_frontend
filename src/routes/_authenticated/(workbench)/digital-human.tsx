import { createFileRoute } from '@tanstack/react-router'
import { DigitalHumanPage } from '@/pages/workbench/digital-human'

export const Route = createFileRoute('/_authenticated/(workbench)/digital-human')({
  component: DigitalHumanPage,
})
