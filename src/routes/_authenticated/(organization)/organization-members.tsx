import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/(organization)/organization-members')({
  beforeLoad: () => {
    throw redirect({
      to: '/organization-team',
      search: { tab: 'members' },
    })
  },
})
