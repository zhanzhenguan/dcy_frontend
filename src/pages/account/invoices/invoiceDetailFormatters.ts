import { invoiceTypeLabels, type InvoiceType } from '@/services/api/invoiceApi'

export const formatInvoiceType = (type: string) =>
  invoiceTypeLabels[type as InvoiceType] ?? type

export const formatAmount = (cents: number) =>
  new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', { hour12: false })
