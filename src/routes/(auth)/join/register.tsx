import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  invite: z.string().uuid('邀请链接无效').optional(),
})

/** 兼容旧链接：/join/register → /join（注册表单已内嵌在邀请页） */
export const Route = createFileRoute('/(auth)/join/register')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/join',
      search: search.invite ? { invite: search.invite } : {},
    })
  },
})
