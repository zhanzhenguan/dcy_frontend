import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/(organization)/organization-groups')({
  beforeLoad: () => {
    throw redirect({
      to: '/organization-team',
      search: { tab: 'groups' },
    })
  },
})
