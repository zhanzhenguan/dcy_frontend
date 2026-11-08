import { createFileRoute } from '@tanstack/react-router'
import { VideoGenerationPage } from '@/pages/workbench/video-generation'

export const Route = createFileRoute('/_authenticated/(workbench)/video/image')({
  component: () => <VideoGenerationPage mode='image' />,
})
