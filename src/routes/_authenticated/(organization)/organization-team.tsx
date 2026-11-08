import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { OrganizationTeamPage } from '@/pages/organization/team'

const teamSearchSchema = z.object({
  tab: z
    .enum(['members', 'groups', 'join-requests'])
    .optional()
    .catch('members'),
})

export const Route = createFileRoute('/_authenticated/(organization)/organization-team')({
  validateSearch: teamSearchSchema,
  component: OrganizationTeamRoute,
})

function OrganizationTeamRoute() {
  const { tab } = Route.useSearch()
  return <OrganizationTeamPage tab={tab ?? 'members'} />
}
