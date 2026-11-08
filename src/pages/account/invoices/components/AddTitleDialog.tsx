import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createInvoiceTitle,
  updateInvoiceTitle,
  type InvoiceScope,
  type InvoiceTitle,
  type InvoiceType,
  type TaxpayerType,
} from '@/services/api/invoiceApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radioGroup'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/utils/utils'
import type {
  AddTitleDialogProps,
  AddTitleFormState,
  InvoiceTypeKind,
} from '../types'

const invoiceInputClass =
  'bg-primary/5 border-primary/10 focus-visible:ring-primary/25 h-10'

function buildEmptyForm(defaultScope: InvoiceScope): AddTitleFormState {
  return {
    titleScope: defaultScope,
    taxpayerType: 'SMALL',
    invoiceTypeKind: 'ORDINARY',
    company_name: '',
    email: '',
    tax_id: '',
    bank_name: '',
    bank_account: '',
    address: '',
    is_default: false,
  }
}

function toApiInvoiceType(kind: InvoiceTypeKind): InvoiceType {
  return kind === 'SPECIAL'
    ? 'VAT_SPECIAL_ELECTRONIC'
    : 'VAT_ORDINARY_ELECTRONIC'
}

function buildFormFromTitle(title: InvoiceTitle): AddTitleFormState {
  const titleScope = title.scope ?? 'PERSONAL'
  return {
    titleScope,
    taxpayerType: title.taxpayer_type ?? 'SMALL',
    invoiceTypeKind:
      title.default_invoice_type === 'VAT_SPECIAL_ELECTRONIC'
        ? 'SPECIAL'
        : 'ORDINARY',
    company_name: title.company_name,
    email: title.email ?? '',
    tax_id: title.tax_id ?? '',
    bank_name: title.bank_name ?? '',
    bank_account: title.bank_account ?? '',
    address: title.address ?? '',
    is_default: Boolean(title.is_default),
  }
}

export const AddTitleDialog = ({
  open,
  onOpenChange,
  onSuccess,
  defaultScope,
  allowScopeChoice = false,
  title,
}: AddTitleDialogProps) => {
  const isEdit = Boolean(title)
  const [form, setForm] = useState<AddTitleFormState>(() =>
    buildEmptyForm(defaultScope)
  )
  const [showOptional, setShowOptional] = useState(true)

  useEffect(() => {
    if (!open) return
    if (title) {
      setForm(buildFormFromTitle(title))
    } else {
      setForm(buildEmptyForm(defaultScope))
    }
    setShowOptional(true)
  }, [open, defaultScope, title])

  const isPersonal = form.titleScope === 'PERSONAL'
  const canSelectSpecial =
    !isPersonal && form.taxpayerType === 'GENERAL'

  useEffect(() => {
    if (!canSelectSpecial && form.invoiceTypeKind === 'SPECIAL') {
      setForm((current) => ({ ...current, invoiceTypeKind: 'ORDINARY' }))
    }
  }, [canSelectSpecial, form.invoiceTypeKind])

  const mutation = useMutation({
    mutationFn: (payload: {
      input: Parameters<typeof createInvoiceTitle>[0]
      scope: InvoiceScope
    }) => {
      if (isEdit && title) {
        return updateInvoiceTitle(title.id, payload.input, payload.scope)
      }
      return createInvoiceTitle(payload.input, payload.scope)
    },
    onSuccess: () => {
      toast.success(isEdit ? '发票抬头已更新' : '发票抬头已保存')
      onSuccess()
      onOpenChange(false)
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, isEdit ? '更新抬头失败' : '保存抬头失败')
      ),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const companyName = form.company_name.trim()
    const email = form.email.trim()
    const taxId = form.tax_id.trim()

    if (!companyName) {
      toast.error(isPersonal ? '请输入发票抬头' : '请输入企业名称')
      return
    }
    if (!email) {
      toast.error('请输入接收发票的邮箱')
      return
    }
    if (!isPersonal && !taxId) {
      toast.error('请输入单位税号')
      return
    }

    mutation.mutate({
      scope: form.titleScope,
      input: {
        company_name: companyName,
        email,
        tax_id: taxId || undefined,
        taxpayer_type: isPersonal ? undefined : form.taxpayerType,
        default_invoice_type: toApiInvoiceType(form.invoiceTypeKind),
        bank_name: form.bank_name.trim() || undefined,
        bank_account: form.bank_account.trim() || undefined,
        address: form.address.trim() || undefined,
        is_default: form.is_default,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='gap-0 overflow-hidden p-0 sm:max-w-[520px]'>
        <DialogHeader className='border-b px-6 py-4'>
          <DialogTitle className='text-base font-semibold'>
            {isEdit ? '编辑抬头' : '新增抬头'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit}>
          <div className='space-y-5 px-6 py-5'>
            <RadioFieldRow label='抬头类型'>
              <RadioGroup
                className='flex flex-row flex-wrap gap-5'
                value={form.titleScope}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    titleScope: value as InvoiceScope,
                    taxpayerType: 'SMALL',
                    invoiceTypeKind: 'ORDINARY',
                  }))
                }
                disabled={!allowScopeChoice || isEdit}
              >
                <RadioOption
                  idPrefix='scope'
                  value='PERSONAL'
                  label='个人'
                />
                <RadioOption
                  idPrefix='scope'
                  value='ENTERPRISE'
                  label='企业'
                />
              </RadioGroup>
            </RadioFieldRow>

            {!isPersonal ? (
              <RadioFieldRow label='纳税人类型'>
                <RadioGroup
                  className='flex flex-row flex-wrap gap-5'
                  value={form.taxpayerType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      taxpayerType: value as TaxpayerType,
                      invoiceTypeKind:
                        value === 'SMALL' ? 'ORDINARY' : current.invoiceTypeKind,
                    }))
                  }
                >
                  <RadioOption
                    idPrefix='taxpayer'
                    value='SMALL'
                    label='小规模纳税人'
                  />
                  <RadioOption
                    idPrefix='taxpayer'
                    value='GENERAL'
                    label='一般纳税人'
                  />
                </RadioGroup>
              </RadioFieldRow>
            ) : null}

            <RadioFieldRow label='发票类型'>
              <RadioGroup
                className='flex flex-row flex-wrap gap-5'
                value={form.invoiceTypeKind}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    invoiceTypeKind: value as InvoiceTypeKind,
                  }))
                }
              >
                <RadioOption
                  idPrefix='invoice-kind'
                  value='ORDINARY'
                  label='普票'
                />
                <RadioOption
                  idPrefix='invoice-kind'
                  value='SPECIAL'
                  label='专票'
                  disabled={!canSelectSpecial}
                />
              </RadioGroup>
            </RadioFieldRow>

            <InputFieldRow
              label='发票抬头'
              required
              input={
                <Input
                  className={invoiceInputClass}
                  value={form.company_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      company_name: event.target.value,
                    }))
                  }
                  placeholder={
                    isPersonal ? '请输入发票抬头' : '请输入企业名称'
                  }
                />
              }
            />

            <InputFieldRow
              label='邮箱地址'
              required
              input={
                <Input
                  className={invoiceInputClass}
                  type='email'
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder='请输入接收发票的邮箱'
                />
              }
            />

            <InputFieldRow
              label='单位税号'
              required={!isPersonal}
              input={
                <Input
                  className={invoiceInputClass}
                  value={form.tax_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tax_id: event.target.value,
                    }))
                  }
                  placeholder={
                    isPersonal
                      ? '个人可填身份证号（非必填）'
                      : '请输入15位或18位单位税号'
                  }
                />
              }
            />

            <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
              <Label
                htmlFor='add-title-is-default'
                className='w-[5.5rem] shrink-0 justify-end text-sm font-normal'
              >
                设为默认
              </Label>
              <div className='flex min-w-0 flex-1 items-center gap-2'>
                <Switch
                  id='add-title-is-default'
                  checked={form.is_default}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      is_default: checked,
                    }))
                  }
                />
                <span className='text-muted-foreground text-xs'>
                  {form.is_default ? '申请开票时优先选用' : '默认关闭'}
                </span>
              </div>
            </div>

            {!isPersonal ? (
              <>
                <button
                  type='button'
                  className='text-primary flex items-center gap-1 text-sm font-medium'
                  onClick={() => setShowOptional((value) => !value)}
                >
                  {showOptional ? '收起非必填项' : '展开非必填项'}
                  {showOptional ? (
                    <ChevronUp className='size-4' />
                  ) : (
                    <ChevronDown className='size-4' />
                  )}
                </button>

                {showOptional ? (
                  <div className='space-y-5'>
                    <InputFieldRow
                      label='开户银行'
                      input={
                        <Input
                          className={invoiceInputClass}
                          value={form.bank_name}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              bank_name: event.target.value,
                            }))
                          }
                          placeholder='请输入开户银行'
                        />
                      }
                    />
                    <InputFieldRow
                      label='银行账号'
                      input={
                        <Input
                          className={invoiceInputClass}
                          value={form.bank_account}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              bank_account: event.target.value,
                            }))
                          }
                          placeholder='请输入银行账号'
                        />
                      }
                    />
                    <InputFieldRow
                      label='公司地址'
                      input={
                        <Input
                          className={invoiceInputClass}
                          value={form.address}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              address: event.target.value,
                            }))
                          }
                          placeholder='请输入公司地址'
                        />
                      }
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <DialogFooter className='border-t bg-muted/20 px-6 py-4 sm:justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '提交中...' : isEdit ? '保存' : '确定'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RadioFieldRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
      <span className='text-muted-foreground w-[5.5rem] shrink-0 text-sm'>
        {label}
      </span>
      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  )
}

function InputFieldRow({
  label,
  required,
  input,
}: {
  label: string
  required?: boolean
  input: ReactNode
}) {
  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
      <Label className='w-[5.5rem] shrink-0 justify-end text-sm font-normal'>
        {required ? (
          <span className='text-destructive me-0.5' aria-hidden>*</span>
        ) : null}
        {label}
      </Label>
      <div className='min-w-0 flex-1'>{input}</div>
    </div>
  )
}

function RadioOption({
  idPrefix,
  value,
  label,
  disabled,
}: {
  idPrefix: string
  value: string
  label: string
  disabled?: boolean
}) {
  const id = `add-title-${idPrefix}-${value}`
  return (
    <div className='flex items-center gap-2'>
      <RadioGroupItem value={value} id={id} disabled={disabled} />
      <Label
        htmlFor={id}
        className={cn(
          'font-normal',
          disabled && 'text-muted-foreground opacity-60'
        )}
      >
        {label}
      </Label>
    </div>
  )
}
