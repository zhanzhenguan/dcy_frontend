import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { CreateVideoPage } from '@/pages/workbench/create-video'

const createSearchSchema = z.object({
  mode: z.enum(['competitive', 'custom']).optional().catch(undefined),
  draftId: z.string().uuid().optional().catch(undefined),
  taskId: z.string().uuid().optional().catch(undefined),
  duplicate: z.enum(['true']).optional().catch(undefined),
  humanId: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/(workbench)/create')({
  validateSearch: createSearchSchema,
  component: CreateVideoRoute,
})

function CreateVideoRoute() {
  const { mode, draftId, taskId, duplicate, humanId } = Route.useSearch()

  return (
    <CreateVideoPage
      initialMode={mode}
      draftId={draftId}
      taskId={taskId}
      createAsNew={duplicate === 'true'}
      initialHumanId={humanId}
    />
  )
}
