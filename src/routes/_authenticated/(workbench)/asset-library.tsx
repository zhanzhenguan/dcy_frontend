import { createFileRoute } from '@tanstack/react-router'
import { AssetLibraryPage } from '@/pages/workbench/asset-library'

export const Route = createFileRoute('/_authenticated/(workbench)/asset-library')({
  component: AssetLibraryPage,
})
