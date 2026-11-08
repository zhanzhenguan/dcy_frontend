import { createFileRoute } from '@tanstack/react-router'
import { Chats } from '@/pages/workbench/chats'

export const Route = createFileRoute('/_authenticated/(workbench)/chats/')({
  component: Chats,
})
