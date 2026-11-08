import {
  isCurrentEnterpriseMember,
  isEnterpriseTenant,
} from '@/utils/tenantAccess'
import { useAuthStore } from '@/stores/authStore'
import { EnterpriseWorkbench } from './components/EnterpriseWorkbench'
import { PersonalWorkbench } from './components/PersonalWorkbench'

export const Dashboard = () => {
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const isEnterprise = isEnterpriseTenant(tenant)

  if (!isEnterprise) {
    return <PersonalWorkbench />
  }

  // 企业成员：概览卡片 + 创作模块；owner / manager / leader：完整企业工作台
  if (isCurrentEnterpriseMember(tenant)) {
    return <PersonalWorkbench variant='enterprise-member' />
  }

  return <EnterpriseWorkbench />
}
