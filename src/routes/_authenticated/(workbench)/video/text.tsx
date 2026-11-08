import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { VideoGenerationPage } from '@/pages/workbench/video-generation'

const textVideoSearchSchema = z.object({
  productUrl: z.string().url().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/(workbench)/video/text')({
  validateSearch: textVideoSearchSchema,
  component: TextVideoRoute,
})

function TextVideoRoute() {
  const { productUrl } = Route.useSearch()
  const initialPrompt = productUrl
    ? `请分析以下竞品链接并生成多语言带货视频：${productUrl}`
    : undefined

  return <VideoGenerationPage mode='text' initialPrompt={initialPrompt} />
}
