import { request } from '@/services/request'

type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

export type InvoiceStatus = 'ISSUED' | 'PROCESSING' | 'REJECTED' | 'CANCELLED'

export type InvoiceType =
  | 'VAT_ORDINARY_ELECTRONIC'
  | 'VAT_SPECIAL_ELECTRONIC'

export type InvoiceRecord = {
  id: string
  applied_at: string
  title_name: string
  invoice_type: InvoiceType
  invoice_number: string | null
  /** 金额（分） */
  amount: number
  status: InvoiceStatus | string
  /** 驳回原因，仅 status=REJECTED 时有值 */
  reject_reason?: string | null
}

export type InvoiceRecordOrderItem = {
  order_no: string
  paid_at: string
  /** 开票金额（分） */
  invoice_amount: number
}

export type InvoiceRecordDetail = InvoiceRecord & {
  email?: string
  tax_id?: string
  remark?: string
  issued_at?: string | null
  /** PDF 发票文件地址（已开具时可能有） */
  pdf_file_url?: string | null
  /** OFD 发票文件地址（已开具时可能有） */
  ofd_file_url?: string | null
  orders: InvoiceRecordOrderItem[]
}

export type InvoiceTitle = {
  id: string
  company_name: string
  tax_id: string
  bank_name?: string
  bank_account?: string
  address?: string
  phone?: string
  is_default: boolean
  created_at: string
  /** 抬头归属：个人 / 企业 */
  scope?: InvoiceScope
  /** 默认开票类型（展示用） */
  default_invoice_type?: InvoiceType
  email?: string
  taxpayer_type?: TaxpayerType
}

export type InvoiceScope = 'PERSONAL' | 'ENTERPRISE'

export type InvoiceSummary = {
  /** 可开票金额（分） */
  available_amount: number
  /** 已消耗金额（分） */
  consumed_amount: number
  /** 已开票金额（分） */
  invoiced_amount: number
}

export type InvoiceRecordList = {
  total: number
  items: InvoiceRecord[]
}

export type InvoiceTitleList = {
  total: number
  items: InvoiceTitle[]
}

export type TaxpayerType = 'SMALL' | 'GENERAL'

export type CreateInvoiceTitleInput = {
  company_name: string
  tax_id?: string
  email: string
  bank_name?: string
  bank_account?: string
  address?: string
  phone?: string
  is_default?: boolean
  taxpayer_type?: TaxpayerType
  default_invoice_type?: InvoiceType
}

export type UpdateInvoiceTitleInput = CreateInvoiceTitleInput

export type ApplyInvoiceInput = {
  title_id: string
  title_scope?: InvoiceScope
  invoice_type: InvoiceType
  amount: number
  order_ids?: string[]
  remark?: string
}

export type ResubmitInvoiceInput = {
  title_id?: string
  title_scope?: InvoiceScope
  invoice_type?: InvoiceType
  order_ids?: string[]
  remark?: string
}

export type InvoiceEligibleOrder = {
  id: string
  order_no: string
  paid_at: string
  /** 可开票金额（分） */
  invoice_amount: number
  invoiced: boolean
}

export type InvoiceEligibleOrderList = {
  total: number
  items: InvoiceEligibleOrder[]
}

const mockEligibleOrdersEnterprise: InvoiceEligibleOrder[] = [
  {
    id: 'ord-001',
    order_no: 'ORD-20231001-001',
    paid_at: '2023-10-01T14:23:05+08:00',
    invoice_amount: 500000,
    invoiced: false,
  },
  {
    id: 'ord-002',
    order_no: 'ORD-20230915-082',
    paid_at: '2023-09-15T09:12:44+08:00',
    invoice_amount: 250000,
    invoiced: false,
  },
  {
    id: 'ord-003',
    order_no: 'ORD-20230822-114',
    paid_at: '2023-08-22T16:45:10+08:00',
    invoice_amount: 500000,
    invoiced: false,
  },
  {
    id: 'ord-004',
    order_no: 'ORD-20230710-045',
    paid_at: '2023-07-10T11:20:00+08:00',
    invoice_amount: 0,
    invoiced: true,
  },
]

const mockEligibleOrdersPersonal: InvoiceEligibleOrder[] = [
  {
    id: 'ord-p-001',
    order_no: 'ORD-20240102-008',
    paid_at: '2024-01-02T10:15:00+08:00',
    invoice_amount: 180000,
    invoiced: false,
  },
  {
    id: 'ord-p-002',
    order_no: 'ORD-20231218-021',
    paid_at: '2023-12-18T16:40:22+08:00',
    invoice_amount: 200000,
    invoiced: false,
  },
]

const USE_MOCK = import.meta.env.VITE_INVOICE_API_MOCK === 'true'

const mockSummaryEnterprise: InvoiceSummary = {
  available_amount: 1250000,
  consumed_amount: 4520000,
  invoiced_amount: 3270000,
}

const mockSummaryPersonal: InvoiceSummary = {
  available_amount: 380000,
  consumed_amount: 1280000,
  invoiced_amount: 900000,
}

const mockRecordsEnterprise: InvoiceRecord[] = [
  {
    id: 'inv-001',
    applied_at: '2023-10-24T14:30:00+08:00',
    title_name: '厦门某某科技有限公司',
    invoice_type: 'VAT_ORDINARY_ELECTRONIC',
    invoice_number: '12345678901234567890',
    amount: 500000,
    status: 'ISSUED',
  },
  {
    id: 'inv-002',
    applied_at: '2023-10-20T09:15:00+08:00',
    title_name: '厦门某某贸易有限公司',
    invoice_type: 'VAT_SPECIAL_ELECTRONIC',
    invoice_number: null,
    amount: 1200000,
    status: 'PROCESSING',
  },
  {
    id: 'inv-003',
    applied_at: '2023-10-15T16:45:00+08:00',
    title_name: '厦门某某科技有限公司',
    invoice_type: 'VAT_ORDINARY_ELECTRONIC',
    invoice_number: '09876543210987654321',
    amount: 1530000,
    status: 'ISSUED',
  },
]

const mockRecordsPersonal: InvoiceRecord[] = [
  {
    id: 'inv-p-001',
    applied_at: '2024-01-12T11:20:00+08:00',
    title_name: '陈某某',
    invoice_type: 'VAT_ORDINARY_ELECTRONIC',
    invoice_number: '23456789012345678901',
    amount: 200000,
    status: 'ISSUED',
  },
  {
    id: 'inv-p-002',
    applied_at: '2024-01-08T15:40:00+08:00',
    title_name: '陈某某',
    invoice_type: 'VAT_ORDINARY_ELECTRONIC',
    invoice_number: null,
    amount: 180000,
    status: 'PROCESSING',
  },
]

const mockTitlesEnterprise: InvoiceTitle[] = [
  {
    id: 'title-001',
    company_name: '厦门某某科技有限公司',
    tax_id: '91350200MA8XXXXX1X',
    bank_name: '中国工商银行厦门分行',
    bank_account: '1234567890123456789',
    address: '厦门市思明区软件园二期',
    phone: '0592-88888888',
    is_default: true,
    created_at: '2023-09-01T10:00:00+08:00',
    scope: 'ENTERPRISE',
    default_invoice_type: 'VAT_SPECIAL_ELECTRONIC',
  },
  {
    id: 'title-002',
    company_name: '厦门某某贸易有限公司',
    tax_id: '91350200MA8XXXXX2X',
    bank_name: '中国建设银行厦门分行',
    bank_account: '9876543210987654321',
    is_default: false,
    created_at: '2023-09-15T14:20:00+08:00',
    scope: 'ENTERPRISE',
    default_invoice_type: 'VAT_ORDINARY_ELECTRONIC',
  },
]

const mockTitlesPersonal: InvoiceTitle[] = [
  {
    id: 'title-p-001',
    company_name: '张三',
    tax_id: '350203199001011234',
    is_default: false,
    created_at: '2024-01-01T09:00:00+08:00',
    scope: 'PERSONAL',
    default_invoice_type: 'VAT_ORDINARY_ELECTRONIC',
  },
]

type MockStore = {
  summary: InvoiceSummary
  records: InvoiceRecord[]
  titles: InvoiceTitle[]
}

const mockStores: Record<InvoiceScope, MockStore> = {
  ENTERPRISE: {
    summary: { ...mockSummaryEnterprise },
    records: [...mockRecordsEnterprise],
    titles: [...mockTitlesEnterprise],
  },
  PERSONAL: {
    summary: { ...mockSummaryPersonal },
    records: [...mockRecordsPersonal],
    titles: [...mockTitlesPersonal],
  },
}

/** 显式传入时规范化；未传则返回 undefined，由后端按当前会话租户推断。 */
function normalizeScope(scope?: InvoiceScope): InvoiceScope | undefined {
  if (scope === 'ENTERPRISE' || scope === 'PERSONAL') return scope
  return undefined
}

function getMockStore(scope?: InvoiceScope) {
  return mockStores[normalizeScope(scope) ?? 'PERSONAL']
}

function withOptionalScope<T extends Record<string, unknown>>(
  params: T,
  scope?: InvoiceScope
) {
  const normalized = normalizeScope(scope)
  return normalized ? { ...params, scope: normalized } : { ...params }
}

async function mockDelay(ms = 280) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getInvoiceSummary(scope?: InvoiceScope) {
  if (USE_MOCK) {
    await mockDelay()
    return { ...getMockStore(scope).summary }
  }
  const { data } = await request.get<ApiResponse<InvoiceSummary>>(
    '/v1/invoices/summary',
    { params: withOptionalScope({}, scope) }
  )
  if (data.code !== 0) throw new Error(data.msg || '获取发票概览失败')
  return data.data
}

export async function listInvoiceRecords(params: {
  page: number
  page_size: number
  scope?: InvoiceScope
}) {
  if (USE_MOCK) {
    await mockDelay()
    const store = getMockStore(params.scope)
    const start = (params.page - 1) * params.page_size
    const items = store.records.slice(start, start + params.page_size)
    return { total: store.records.length, items }
  }
  const { data } = await request.get<ApiResponse<InvoiceRecordList>>(
    '/v1/invoices',
    {
      params: withOptionalScope(
        { page: params.page, page_size: params.page_size },
        params.scope
      ),
    }
  )
  if (data.code !== 0) throw new Error(data.msg || '查询开票记录失败')
  return data.data
}

function buildMockInvoiceDetail(
  record: InvoiceRecord,
  scope: InvoiceScope
): InvoiceRecordDetail {
  const store = getMockStore(scope)
  const title = store.titles.find(
    (item) => item.company_name === record.title_name
  )
  const orderSource =
    scope === 'ENTERPRISE'
      ? mockEligibleOrdersEnterprise
      : mockEligibleOrdersPersonal
  const orders = orderSource
    .filter((item) => item.invoiced || item.invoice_amount > 0)
    .slice(0, 3)
    .map((item) => ({
      order_no: item.order_no,
      paid_at: item.paid_at,
      invoice_amount: item.invoiced ? item.invoice_amount : record.amount / 3,
    }))

  return {
    ...record,
    email: title?.email ?? 'invoice@example.com',
    tax_id: title?.tax_id,
    remark:
      record.status === 'REJECTED'
        ? undefined
        : record.status === 'PROCESSING'
          ? '待财务审核开具'
          : undefined,
    reject_reason:
      record.status === 'REJECTED' ? '税号与抬头信息不一致，请修改后重新提交' : undefined,
    issued_at:
      record.status === 'ISSUED'
        ? new Date(
            new Date(record.applied_at).getTime() + 2 * 24 * 60 * 60 * 1000
          ).toISOString()
        : null,
    pdf_file_url:
      record.status === 'ISSUED'
        ? 'https://example.com/mock-invoice.pdf'
        : null,
    ofd_file_url: null,
    orders: orders.length
      ? orders
      : [
          {
            order_no: '—',
            paid_at: record.applied_at,
            invoice_amount: record.amount,
          },
        ],
  }
}

function normalizeInvoiceRecordDetail(
  detail: InvoiceRecordDetail
): InvoiceRecordDetail {
  return {
    ...detail,
    invoice_number: detail.invoice_number?.trim() || null,
    email: detail.email?.trim() || undefined,
    tax_id: detail.tax_id?.trim() || undefined,
    remark: detail.remark?.trim() || undefined,
    reject_reason: detail.reject_reason?.trim() || undefined,
    issued_at: detail.issued_at?.trim() || null,
    pdf_file_url: detail.pdf_file_url?.trim() || null,
    ofd_file_url: detail.ofd_file_url?.trim() || null,
    orders: Array.isArray(detail.orders) ? detail.orders : [],
  }
}

export async function getInvoiceRecord(id: string, scope?: InvoiceScope) {
  if (USE_MOCK) {
    await mockDelay()
    const scopes: InvoiceScope[] = scope
      ? [normalizeScope(scope)!]
      : ['PERSONAL', 'ENTERPRISE']
    for (const candidate of scopes) {
      const record = getMockStore(candidate).records.find(
        (item) => item.id === id
      )
      if (record) {
        return normalizeInvoiceRecordDetail(
          buildMockInvoiceDetail(record, candidate)
        )
      }
    }
    throw new Error('开票记录不存在')
  }
  const { data } = await request.get<ApiResponse<InvoiceRecordDetail>>(
    `/v1/invoices/${encodeURIComponent(id)}`,
    { params: withOptionalScope({}, scope) }
  )
  if (data.code !== 0) throw new Error(data.msg || '查询开票详情失败')
  return normalizeInvoiceRecordDetail(data.data)
}

export async function listInvoiceTitles(scope?: InvoiceScope) {
  if (USE_MOCK) {
    await mockDelay()
    const resolvedScope = normalizeScope(scope)
    if (!resolvedScope) {
      const items = [
        ...mockStores.PERSONAL.titles.map((item) => ({
          ...item,
          scope: item.scope ?? 'PERSONAL',
        })),
        ...mockStores.ENTERPRISE.titles.map((item) => ({
          ...item,
          scope: item.scope ?? 'ENTERPRISE',
        })),
      ]
      return { total: items.length, items }
    }
    const store = getMockStore(resolvedScope)
    return {
      total: store.titles.length,
      items: store.titles.map((item) => ({
        ...item,
        scope: item.scope ?? resolvedScope,
      })),
    }
  }
  const { data } = await request.get<ApiResponse<InvoiceTitleList>>(
    '/v1/invoice-titles',
    { params: withOptionalScope({}, scope) }
  )
  if (data.code !== 0) throw new Error(data.msg || '查询发票抬头失败')
  return data.data
}

export async function listInvoiceEligibleOrders(params: {
  page: number
  page_size: number
  scope?: InvoiceScope
  order_no?: string
}) {
  const scope = normalizeScope(params.scope)
  if (USE_MOCK) {
    await mockDelay()
    const source =
      (scope ?? 'PERSONAL') === 'ENTERPRISE'
        ? mockEligibleOrdersEnterprise
        : mockEligibleOrdersPersonal
    const keyword = params.order_no?.trim().toLowerCase()
    const filtered = keyword
      ? source.filter((item) =>
          item.order_no.toLowerCase().includes(keyword)
        )
      : source
    const start = (params.page - 1) * params.page_size
    const items = filtered.slice(start, start + params.page_size)
    return { total: filtered.length, items }
  }
  const { data } = await request.get<ApiResponse<InvoiceEligibleOrderList>>(
    '/v1/invoices/eligible-orders',
    {
      params: withOptionalScope(
        {
          page: params.page,
          page_size: params.page_size,
          order_no: params.order_no || undefined,
        },
        scope
      ),
    }
  )
  if (data.code !== 0) throw new Error(data.msg || '查询可开票订单失败')
  return data.data
}

export async function createInvoiceTitle(
  input: CreateInvoiceTitleInput,
  scope?: InvoiceScope
) {
  if (USE_MOCK) {
    await mockDelay()
    const store = getMockStore(scope)
    const item: InvoiceTitle = {
      id: `title-${Date.now()}`,
      company_name: input.company_name.trim(),
      tax_id: input.tax_id?.trim() || '',
      email: input.email.trim(),
      taxpayer_type: input.taxpayer_type,
      bank_name: input.bank_name?.trim() || undefined,
      bank_account: input.bank_account?.trim() || undefined,
      address: input.address?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      is_default: input.is_default ?? false,
      created_at: new Date().toISOString(),
      scope: normalizeScope(scope) ?? 'PERSONAL',
      default_invoice_type:
        input.default_invoice_type ?? 'VAT_ORDINARY_ELECTRONIC',
    }
    if (item.is_default) {
      store.titles = store.titles.map((t) => ({ ...t, is_default: false }))
    }
    store.titles = [item, ...store.titles]
    return item
  }
  const { data } = await request.post<ApiResponse<InvoiceTitle>>(
    '/v1/invoice-titles',
    input,
    { params: withOptionalScope({}, scope) }
  )
  if (data.code !== 0) throw new Error(data.msg || '新增抬头失败')
  return data.data
}

export async function updateInvoiceTitle(
  id: string,
  input: UpdateInvoiceTitleInput,
  scope?: InvoiceScope
) {
  if (USE_MOCK) {
    await mockDelay()
    const store = getMockStore(scope)
    const index = store.titles.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('发票抬头不存在')
    const current = store.titles[index]
    const isDefault = input.is_default ?? current.is_default
    if (isDefault) {
      store.titles = store.titles.map((t) => ({ ...t, is_default: false }))
    }
    const updated: InvoiceTitle = {
      ...current,
      company_name: input.company_name.trim(),
      tax_id: input.tax_id?.trim() || '',
      email: input.email.trim(),
      taxpayer_type: input.taxpayer_type ?? current.taxpayer_type,
      bank_name: input.bank_name?.trim() || undefined,
      bank_account: input.bank_account?.trim() || undefined,
      address: input.address?.trim() || undefined,
      phone: input.phone?.trim() || current.phone,
      is_default: isDefault,
      default_invoice_type:
        input.default_invoice_type ??
        current.default_invoice_type ??
        'VAT_ORDINARY_ELECTRONIC',
    }
    store.titles[index] = updated
    return updated
  }
  const { data } = await request.put<ApiResponse<InvoiceTitle>>(
    `/v1/invoice-titles/${encodeURIComponent(id)}`,
    input,
    { params: withOptionalScope({}, scope) }
  )
  if (data.code !== 0) throw new Error(data.msg || '更新抬头失败')
  return data.data
}

export async function deleteInvoiceTitle(id: string, scope?: InvoiceScope) {
  if (USE_MOCK) {
    await mockDelay()
    const store = getMockStore(scope)
    const index = store.titles.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('发票抬头不存在')
    store.titles = store.titles.filter((item) => item.id !== id)
    return
  }
  const { data } = await request.delete<ApiResponse<null>>(
    `/v1/invoice-titles/${encodeURIComponent(id)}`,
    { params: withOptionalScope({}, scope) }
  )
  if (data.code !== 0) throw new Error(data.msg || '删除抬头失败')
}

export async function applyInvoice(input: ApplyInvoiceInput, scope?: InvoiceScope) {
  if (USE_MOCK) {
    await mockDelay()
    const store = getMockStore(scope)
    const title = store.titles.find((t) => t.id === input.title_id)
    const record: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      applied_at: new Date().toISOString(),
      title_name: title?.company_name ?? '未知抬头',
      invoice_type: input.invoice_type,
      invoice_number: null,
      amount: input.amount,
      status: 'PROCESSING',
      reject_reason: null,
    }
    store.records = [record, ...store.records]
    return record
  }
  const { data } = await request.post<ApiResponse<InvoiceRecord>>(
    '/v1/invoices',
    input,
    { params: withOptionalScope({}, scope) }
  )
  if (data.code !== 0) throw new Error(data.msg || '申请开票失败')
  return data.data
}

export async function resubmitInvoice(
  applicationNo: string,
  input: ResubmitInvoiceInput,
  scope?: InvoiceScope
) {
  if (USE_MOCK) {
    await mockDelay()
    const scopes: InvoiceScope[] = scope
      ? [normalizeScope(scope)!]
      : ['PERSONAL', 'ENTERPRISE']
    for (const candidate of scopes) {
      const store = getMockStore(candidate)
      const index = store.records.findIndex((item) => item.id === applicationNo)
      if (index < 0) continue
      const current = store.records[index]
      if (current.status !== 'REJECTED') {
        throw new Error('仅已驳回的申请可重新提交')
      }
      const title = input.title_id
        ? store.titles.find((t) => t.id === input.title_id)
        : undefined
      const updated: InvoiceRecord = {
        ...current,
        status: 'PROCESSING',
        reject_reason: null,
        title_name: title?.company_name ?? current.title_name,
        applied_at: new Date().toISOString(),
      }
      store.records[index] = updated
      return updated
    }
    throw new Error('开票记录不存在')
  }
  const { data } = await request.post<ApiResponse<InvoiceRecord>>(
    `/v1/invoices/${encodeURIComponent(applicationNo)}/resubmit`,
    input,
    { params: withOptionalScope({}, scope) }
  )
  if (data.code !== 0) throw new Error(data.msg || '重新提交失败')
  return data.data
}

/** 取消开票申请（仅 PROCESSING / 待审核） */
export async function cancelInvoice(
  applicationNo: string,
  scope?: InvoiceScope
) {
  if (USE_MOCK) {
    await mockDelay()
    const scopes: InvoiceScope[] = scope
      ? [normalizeScope(scope)!]
      : ['PERSONAL', 'ENTERPRISE']
    for (const candidate of scopes) {
      const store = getMockStore(candidate)
      const index = store.records.findIndex((item) => item.id === applicationNo)
      if (index < 0) continue
      const current = store.records[index]
      if (current.status !== 'PROCESSING') {
        throw new Error('仅待审核的申请可取消')
      }
      const updated: InvoiceRecord = {
        ...current,
        status: 'CANCELLED',
        reject_reason: null,
      }
      store.records[index] = updated
      return updated
    }
    throw new Error('开票记录不存在')
  }
  const { data } = await request.post<ApiResponse<InvoiceRecord>>(
    `/v1/invoices/${encodeURIComponent(applicationNo)}/cancel`,
    {},
    { params: withOptionalScope({}, scope) }
  )
  if (data.code !== 0) throw new Error(data.msg || '取消开票申请失败')
  return data.data
}

export const invoiceTypeLabels: Record<InvoiceType, string> = {
  VAT_ORDINARY_ELECTRONIC: '增值税电子普通发票',
  VAT_SPECIAL_ELECTRONIC: '增值税专用发票',
}

/** 抬头列表等场景的简短文案 */
export const invoiceTypeShortLabels: Record<InvoiceType, string> = {
  VAT_ORDINARY_ELECTRONIC: '增值税普通发票',
  VAT_SPECIAL_ELECTRONIC: '增值税专用发票',
}

export const invoiceStatusLabels: Record<string, string> = {
  ISSUED: '已开具',
  PROCESSING: '待审核',
  PENDING_REVIEW: '待审核',
  INVOICING: '开票中',
  SENT: '已发送',
  REJECTED: '申请被驳回',
  FAILED: '开票失败',
  CANCELLED: '已取消',
  VOIDED: '发票已作废',
  RED_FLUSHED: '发票已红冲',
}
