import { type RefObject } from 'react'
import { type QueryClient } from '@tanstack/react-query'
import type { ReferenceMaterialsStackHandle } from '../components/ReferenceMaterialsStack'
import type { ReferenceImage, ReferenceVideo } from '../types'

export type MaterialUploadDeps = {
  getLimits: () => {
    imageMaxSizeBytes: number
    imageMaxSizeMb: number
    maxReferenceImagesLimit: number
    maxReferenceVideosLimit: number
  }
  queryClient: QueryClient
  referenceVideos: ReferenceVideo[]
  setReferenceVideos: React.Dispatch<React.SetStateAction<ReferenceVideo[]>>
  materials: ReferenceImage[]
  setMaterials: React.Dispatch<React.SetStateAction<ReferenceImage[]>>
  setFirstFrame: React.Dispatch<React.SetStateAction<string | null>>
  setLastFrame: React.Dispatch<React.SetStateAction<string | null>>
  setUploading: React.Dispatch<React.SetStateAction<boolean>>
  materialsStackRef: RefObject<ReferenceMaterialsStackHandle | null>
}
