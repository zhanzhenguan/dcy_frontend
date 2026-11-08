import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getApiErrorMessage } from '@/services/api/apiError'
import { beginSignOut, endSignOut } from '@/utils/authSessionGuard'
import { logout } from '@/services/api/authApi'
import { ConfirmDialog } from './ConfirmDialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SignOutDialog = ({ open, onOpenChange }: SignOutDialogProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    const currentPath = location.href
    const refreshToken = auth.session?.refresh_token

    // 先标记主动退出并取消进行中的请求，避免多企业并发 401 连弹 Session expired
    beginSignOut()
    void queryClient.cancelQueries()

    try {
      if (refreshToken) {
        await logout(refreshToken)
      }
    } catch (error) {
      toast.error(
        `${getApiErrorMessage(error, '服务端退出失败')}，本地登录状态已清除`
      )
    } finally {
      auth.reset()
      queryClient.clear()
      setIsLoading(false)
      onOpenChange(false)
      await navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
      endSignOut()
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='退出登录'
      desc='确认退出登录？'
      confirmText='确定'
      cancelBtnText='取消'
      destructive
      isLoading={isLoading}
      handleConfirm={() => void handleSignOut()}
      className='sm:max-w-sm'
    />
  )
}
