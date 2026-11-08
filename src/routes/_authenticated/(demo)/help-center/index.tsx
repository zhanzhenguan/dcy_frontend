import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/common'

export const Route = createFileRoute('/_authenticated/(demo)/help-center/')({
  component: ComingSoon,
})
