import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { TenantInvitationJoinPage } from '@/pages/auth/invitation-join'

const searchSchema = z.object({
  invite: z.string().uuid('邀请链接无效').optional(),
})

export const Route = createFileRoute('/(auth)/join/')({
  component: TenantInvitationJoinPage,
  validateSearch: searchSchema,
})
