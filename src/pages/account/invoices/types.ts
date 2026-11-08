import type {
  InvoiceRecordDetail,
  InvoiceScope,
  InvoiceTitle,
  TaxpayerType,
} from '@/services/api/invoiceApi'

export type InvoiceSectionTab = 'records' | 'titles'

export type InvoiceSectionTabsProps = {
  active: InvoiceSectionTab
  onChange: (value: InvoiceSectionTab) => void
}

export type InvoiceRecordDetailPageProps = {
  invoiceId: string
}

export type InvoiceRecordDetailCardProps = {
  detail: InvoiceRecordDetail
}

export type InvoiceDetailFieldProps = {
  label: string
  value: string
  mono?: boolean
  emphasis?: boolean
  fullWidth?: boolean
}

export type InvoiceStatusBadgeProps = {
  status: string
  className?: string
}

export type CancelInvoiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationNo: string
  scope: InvoiceScope
  onSuccess: () => void
}

export type ResubmitInvoiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: InvoiceRecordDetail
  titles: InvoiceTitle[]
  scope: InvoiceScope
  onSuccess: () => void
}

export type ApplyInvoiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  titles: InvoiceTitle[]
  availableAmount: number
  onSuccess: () => void
  scope: InvoiceScope
}

export type AddTitleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  defaultScope: InvoiceScope
  /** 个人模式下可同时维护企业抬头时，允许在弹窗内切换 */
  allowScopeChoice?: boolean
  /** 传入时为编辑模式 */
  title?: InvoiceTitle | null
}

export type InvoiceTypeKind = 'ORDINARY' | 'SPECIAL'

export type AddTitleFormState = {
  titleScope: InvoiceScope
  taxpayerType: TaxpayerType
  invoiceTypeKind: InvoiceTypeKind
  company_name: string
  email: string
  tax_id: string
  bank_name: string
  bank_account: string
  address: string
  is_default: boolean
}

export type InvoiceTitlesColumnOptions = {
  onEdit: (title: InvoiceTitle) => void
  onDelete: (title: InvoiceTitle) => void
}

export type TitleScopeBadgeProps = {
  scope?: InvoiceScope
}
