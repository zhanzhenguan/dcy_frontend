import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Tasks } from '@/pages/workbench/tasks'

const generationStatuses = [
  'queued',
  'running',
  'cancelled',
  'succeeded',
  'failed',
  'expired',
  'draft',
] as const

const taskSearchSchema = z.object({
  page: z.number().int().positive().optional().catch(1),
  pageSize: z.number().int().min(10).max(50).optional().catch(20),
  status: z.enum(generationStatuses).optional().catch(undefined),
  task: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/(workbench)/tasks/')({
  validateSearch: taskSearchSchema,
  component: Tasks,
})
