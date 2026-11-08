import { createFileRoute } from '@tanstack/react-router'
import { VideoGenerationPage } from '@/pages/workbench/video-generation'

export const Route = createFileRoute('/_authenticated/(workbench)/video/reference')({
  component: () => <VideoGenerationPage mode='video' />,
})
