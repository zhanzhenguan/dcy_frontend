import { AnimatedTabs } from '@/components/common'
import type { InvoiceSectionTab, InvoiceSectionTabsProps } from '../types'

export const InvoiceSectionTabs = ({
  active,
  onChange,
}: InvoiceSectionTabsProps) => (
  <AnimatedTabs
    value={active}
    onValueChange={(value) => onChange(value as InvoiceSectionTab)}
    items={[
      { value: 'records', label: '开票记录' },
      { value: 'titles', label: '抬头管理' },
    ]}
  />
)
