import { request } from '@/services/request'
import {
  isHexColorKey,
  normalizeHexColor,
  statusTagColorPresets,
  type AccountStatusTag,
  type ManagedAccount,
} from '@/pages/workbench/account-management/types'

type ApiResponse<T> = { code: number; msg: string; data: T }

type ApiManagedAccount = {
  id: string
  name: string
  avatar_url: string
  region: string
  platform: string
  account_type: string
  email: string
  password: string
  two_factor_secret: string
  followers: number
  device_serial: string
  network_ip: string
  node_name: string
  node_link: string
  node_qr_url: string
  node_expires_at: string
  statuses: string[]
  tags: string[]
  remark: string
  store_linked: boolean
  owner_user_id: string
  created_at: string
  updated_at: string
}

type ApiStatusTag = {
  id: string
  label: string
  color_key: string
  sort_order: number
  created_at: string
  updated_at: string
}

type ApiSettings = {
  node_expiry_remind_days: number
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

function colorKeyToClassName(colorKey: string) {
  const preset = statusTagColorPresets.find((item) => item.id === colorKey)
  return preset?.className ?? statusTagColorPresets[6].className
}

function classNameToColorKey(className: string) {
  const preset = statusTagColorPresets.find(
    (item) => item.className === className
  )
  return preset?.id ?? 'slate'
}

function tagToColorKey(tag: AccountStatusTag) {
  if (tag.colorHex && isHexColorKey(tag.colorHex)) {
    return normalizeHexColor(tag.colorHex)
  }
  return classNameToColorKey(tag.className)
}

export function mapApiAccount(item: ApiManagedAccount): ManagedAccount {
  return {
    id: item.id,
    name: item.name,
    avatarUrl: item.avatar_url || undefined,
    region: item.region,
    platform: item.platform,
    accountType: item.account_type,
    email: item.email ?? '',
    password: item.password ?? '',
    twoFactorSecret: item.two_factor_secret ?? '',
    followers: item.followers,
    deviceSerial: item.device_serial,
    networkIp: item.network_ip,
    nodeName: item.node_name,
    nodeLink: item.node_link,
    nodeQrUrl: item.node_qr_url || undefined,
    nodeExpiresAt: item.node_expires_at || undefined,
    statuses: item.statuses ?? [],
    tags: item.tags ?? [],
    remark: item.remark || undefined,
    storeLinked: item.store_linked,
    ownerUserId: item.owner_user_id,
  }
}

export function mapApiStatusTag(item: ApiStatusTag): AccountStatusTag {
  if (isHexColorKey(item.color_key)) {
    return {
      id: item.id,
      label: item.label,
      className: '',
      colorHex: normalizeHexColor(item.color_key),
    }
  }
  return {
    id: item.id,
    label: item.label,
    className: colorKeyToClassName(item.color_key),
  }
}

export function toAccountPayload(account: ManagedAccount) {
  return {
    name: account.name,
    avatar_url: account.avatarUrl ?? '',
    region: account.region,
    platform: account.platform,
    account_type: account.accountType,
    email: account.email,
    password: account.password,
    two_factor_secret: account.twoFactorSecret,
    followers: account.followers,
    device_serial: account.deviceSerial,
    network_ip: account.networkIp,
    node_name: account.nodeName,
    node_link: account.nodeLink,
    node_qr_url: account.nodeQrUrl ?? '',
    node_expires_at: account.nodeExpiresAt ?? '',
    statuses: account.statuses,
    tags: account.tags,
    remark: account.remark ?? '',
    store_linked: account.storeLinked,
  }
}

export async function listManagedAccounts(params: {
  page?: number
  page_size?: number
  scope?: string
  owner_user_id?: string
  group_public_id?: string
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: ApiManagedAccount[] }>
  >('/v1/managed-accounts', { params })
  const result = unwrap(data)
  return {
    total: result.total,
    items: (result.items ?? []).map(mapApiAccount),
  }
}

export async function createManagedAccount(account: ManagedAccount) {
  const { data } = await request.post<ApiResponse<ApiManagedAccount>>(
    '/v1/managed-accounts',
    toAccountPayload(account)
  )
  return mapApiAccount(unwrap(data))
}

export async function updateManagedAccount(account: ManagedAccount) {
  const { data } = await request.put<ApiResponse<ApiManagedAccount>>(
    `/v1/managed-accounts/${account.id}`,
    toAccountPayload(account)
  )
  return mapApiAccount(unwrap(data))
}

export async function deleteManagedAccount(id: string) {
  const { data } = await request.delete<ApiResponse<null>>(
    `/v1/managed-accounts/${id}`
  )
  unwrap(data)
}

export async function listManagedAccountStatusTags() {
  const { data } = await request.get<
    ApiResponse<{ items: ApiStatusTag[] }>
  >('/v1/managed-account-status-tags')
  return (unwrap(data).items ?? []).map(mapApiStatusTag)
}

export async function createManagedAccountStatusTag(tag: AccountStatusTag) {
  const { data } = await request.post<ApiResponse<ApiStatusTag>>(
    '/v1/managed-account-status-tags',
    {
      label: tag.label,
      color_key: tagToColorKey(tag),
    }
  )
  return mapApiStatusTag(unwrap(data))
}

export async function updateManagedAccountStatusTag(tag: AccountStatusTag) {
  const { data } = await request.put<ApiResponse<ApiStatusTag>>(
    `/v1/managed-account-status-tags/${tag.id}`,
    {
      label: tag.label,
      color_key: tagToColorKey(tag),
    }
  )
  return mapApiStatusTag(unwrap(data))
}

export async function deleteManagedAccountStatusTag(id: string) {
  const { data } = await request.delete<ApiResponse<null>>(
    `/v1/managed-account-status-tags/${id}`
  )
  unwrap(data)
}

export async function getManagedAccountSettings() {
  const { data } = await request.get<ApiResponse<ApiSettings>>(
    '/v1/managed-account-settings'
  )
  return unwrap(data).node_expiry_remind_days
}

export async function updateManagedAccountSettings(days: number) {
  const { data } = await request.put<ApiResponse<ApiSettings>>(
    '/v1/managed-account-settings',
    { node_expiry_remind_days: days }
  )
  return unwrap(data).node_expiry_remind_days
}

/** 上传节点二维码图片，解析出链接供前端重新生成二维码 */
export async function parseManagedAccountNodeQr(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await request.post<ApiResponse<{ node_link: string }>>(
    '/v1/managed-accounts/parse-node-qr',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  const link = unwrap(data).node_link?.trim()
  if (!link) throw new Error('未能解析出节点链接')
  return link
}
