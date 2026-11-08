import { request } from '@/services/request'
import { getApiErrorMessage } from '@/services/api/apiError'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type AssetScope = 'personal' | 'group' | 'tenant'
export type AssetType = 'image' | 'video'

export type AssetDirectory = {
  id: string
  parent_id: string
  name: string
  scope: AssetScope
  group_public_id: string
  is_group_root: boolean
  sort_order: number
  can_manage: boolean
  children: AssetDirectory[]
}

export type AssetDirectoryTree = {
  roots: AssetDirectory[]
}

export type Asset = {
  id: string
  directory_id: string
  scope: AssetScope
  group_public_id: string
  name: string
  asset_type: AssetType
  mime_type: string
  file_size: number
  preview_url: string
  duration_ms: number
  width: number
  height: number
  status: 'uploading' | 'processing' | 'active' | 'failed' | 'deleted'
  uploaded_by: string
  created_at: number
  updated_at: number
  can_manage: boolean
}

export type ListAssetsParams = {
  scope: AssetScope
  group_public_id?: string
  directory_id?: string
  keyword?: string
  asset_type?: AssetType
  sort?: 'newest' | 'oldest'
  page?: number
  page_size?: number
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function getAssetDirectoryTree() {
  const { data } = await request.get<ApiResponse<AssetDirectoryTree>>(
    '/v1/assets/directory-tree'
  )
  return unwrap(data)
}

export async function listAssets(params: ListAssetsParams) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: Asset[] }>
  >('/v1/assets', { params })
  return unwrap(data)
}

export async function uploadAsset(
  file: File,
  input: Pick<ListAssetsParams, 'scope' | 'group_public_id' | 'directory_id'>
) {
  const form = new FormData()
  form.append('file', file)
  form.append('scope', input.scope)
  if (input.group_public_id)
    form.append('group_public_id', input.group_public_id)
  if (input.directory_id) form.append('directory_id', input.directory_id)
  try {
    const { data } = await request.post<ApiResponse<Asset>>(
      '/v1/assets/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return unwrap(data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, `${file.name} 上传失败`))
  }
}

export async function createAssetDirectory(input: {
  scope: AssetScope
  group_public_id?: string
  parent_id?: string
  name: string
}) {
  const { data } = await request.post<ApiResponse<AssetDirectory>>(
    '/v1/assets/directories',
    input
  )
  return unwrap(data)
}

export async function updateAssetDirectory(id: string, name: string) {
  const { data } = await request.put<ApiResponse<AssetDirectory>>(
    `/v1/assets/directories/${id}`,
    { name }
  )
  return unwrap(data)
}

export async function deleteAssetDirectory(id: string) {
  const { data } = await request.delete<ApiResponse<unknown>>(
    `/v1/assets/directories/${id}`
  )
  return unwrap(data)
}

export async function updateAsset(id: string, name: string) {
  const { data } = await request.put<ApiResponse<Asset>>(`/v1/assets/${id}`, {
    name,
  })
  return unwrap(data)
}

export async function deleteAsset(id: string) {
  const { data } = await request.delete<ApiResponse<unknown>>(
    `/v1/assets/${id}`
  )
  return unwrap(data)
}
