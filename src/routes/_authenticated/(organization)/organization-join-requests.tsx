import { createFileRoute, redirect } from '@tanstack/react-router'

/** 旧独立审核页：跳转到团队成员「待审核」Tab。 */
export const Route = createFileRoute(
  '/_authenticated/(organization)/organization-join-requests'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/organization-team',
      search: { tab: 'join-requests' },
    })
  },
})
