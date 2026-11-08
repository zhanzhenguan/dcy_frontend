import { request } from '@/services/request'

type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

export type AdminInvoiceApplication = {
  application_no: string
  tenant_public_id: string
  tenant_name: string
  operator_name: string
  title_name: string
  tax_id: string
  email: string
  invoice_type: string
  amount: number
  status: string
  invoice_number: string
  remark: string
  reject_reason: string
  applied_at: string
  issued_at: string
}

export type AdminInvoiceApplicationDetail = AdminInvoiceApplication & {
  title_type: string
  address: string
  phone: string
  bank_name: string
  bank_account: string
  invoice_code: string
  pdf_file_url: string
  ofd_file_url: string
  orders: Array<{
    order_no: string
    paid_at: string
    invoice_amount: number
  }>
}

export type ListAdminInvoiceApplicationsParams = {
  page: number
  page_size: number
  application_no?: string
  tenant_public_id?: string
  status?: string
}

export async function listAdminInvoiceApplications(
  params: ListAdminInvoiceApplicationsParams
) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: AdminInvoiceApplication[] }>
  >('/v1/admin/invoices/applications', { params })
  if (data.code !== 0) throw new Error(data.msg || '查询开票申请失败')
  return data.data
}

export async function getAdminInvoiceApplication(applicationNo: string) {
  const { data } = await request.get<ApiResponse<AdminInvoiceApplicationDetail>>(
    `/v1/admin/invoices/applications/${encodeURIComponent(applicationNo)}`
  )
  if (data.code !== 0) throw new Error(data.msg || '查询开票申请详情失败')
  return data.data
}

export async function rejectAdminInvoiceApplication(
  applicationNo: string,
  reason: string
) {
  const { data } = await request.post<ApiResponse<AdminInvoiceApplication>>(
    `/v1/admin/invoices/applications/${encodeURIComponent(applicationNo)}/reject`,
    { reason }
  )
  if (data.code !== 0) throw new Error(data.msg || '驳回开票申请失败')
  return data.data
}

export async function issueAdminInvoice(
  applicationNo: string,
  input: {
    invoice_code?: string
    invoice_number: string
    invoice_date: string
    amount?: number
    tax_amount?: number
    total_amount?: number
    pdf_file_url?: string
    ofd_file_url?: string
  }
) {
  const { data } = await request.post<ApiResponse<AdminInvoiceApplicationDetail>>(
    `/v1/admin/invoices/applications/${encodeURIComponent(applicationNo)}/issue`,
    input
  )
  if (data.code !== 0) throw new Error(data.msg || '人工开票失败')
  return data.data
}

/** 上传 PDF / OFD 发票文件，返回归档地址 */
export async function uploadAdminInvoiceAsset(
  file: File,
  fileType: 'pdf' | 'ofd'
) {
  const form = new FormData()
  form.append('file', file)
  form.append('file_type', fileType)
  const { data } = await request.post<
    ApiResponse<{ url: string; file_type: string }>
  >('/v1/admin/invoices/assets', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (data.code !== 0) throw new Error(data.msg || '上传发票文件失败')
  return data.data
}
