import { useNavigate } from '@tanstack/react-router'
import { AnimatedTabs } from '@/components/common'

export type AccountBillingTab = 'profile' | 'orders' | 'invoices'

type AccountBillingTabsProps = {
  active: AccountBillingTab
  profileLabel?: string
  ordersLabel?: string
}

const routeByTab: Record<AccountBillingTab, string> = {
  profile: '/profile',
  orders: '/orders',
  invoices: '/invoices',
}

export const AccountBillingTabs = ({
  active,
  profileLabel = '账户概览',
  ordersLabel = '我的订单',
}: AccountBillingTabsProps) => {
  const navigate = useNavigate()

  return (
    <AnimatedTabs
      value={active}
      onValueChange={(value) => {
        const next = value as AccountBillingTab
        if (next === active) return
        void navigate({ to: routeByTab[next] })
      }}
      items={[
        { value: 'profile', label: profileLabel },
        { value: 'orders', label: ordersLabel },
        { value: 'invoices', label: '发票管理' },
      ]}
      listClassName='border bg-card shadow-xs'
    />
  )
}
