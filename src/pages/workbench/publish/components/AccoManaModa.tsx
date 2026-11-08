import { useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type PlatformItem } from '../types'
import { PlatformIcon } from './PlatformIcons'

interface AccountManageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platform?: PlatformItem | null
  onConnectSuccess: (platformId: string, handle: string) => void
}

export const AccountManageModal = ({
  open,
  onOpenChange,
  platform,
  onConnectSuccess,
}: AccountManageModalProps) => {
  const [handleInput, setHandleInput] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const platformName = platform ? platform.name : '社交平台'

  const handleConnect = () => {
    if (!handleInput.trim()) {
      toast.error('请输入有效账号名称或 Handle')
      return
    }

    setIsConnecting(true)
    setTimeout(() => {
      setIsConnecting(false)
      if (platform) {
        onConnectSuccess(platform.id, handleInput.trim())
      }
      toast.success(`成功连通并同步 ${platformName} 授权状态！`)
      onOpenChange(false)
      setHandleInput('')
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='space-y-4 rounded-2xl p-6 sm:max-w-md'>
        <DialogHeader className='space-y-1.5'>
          <div className='flex items-center gap-3'>
            {platform && (
              <div className='bg-muted flex h-10 w-10 items-center justify-center rounded-xl'>
                <PlatformIcon platformId={platform.id} className='h-5 w-5' />
              </div>
            )}
            <div>
              <DialogTitle className='text-lg font-bold'>
                授权绑定 {platformName}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                直连免 API 模式：系统将通过浏览器 Session 连通账号
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='bg-muted/30 text-muted-foreground space-y-1 rounded-xl border p-3 text-xs'>
            <div className='text-foreground flex items-center gap-1.5 font-bold'>
              <ShieldCheck className='h-4 w-4 text-emerald-500' />
              安全隐私保障承诺
            </div>
            <p className='text-[11px] leading-relaxed'>
              系统仅在本地模拟浏览器排期分发动作，不会存储、传输或修改你的账号密码。
            </p>
          </div>

          <div className='space-y-2'>
            <Label className='text-xs font-semibold'>
              {platformName} 账号名称 / Handle
            </Label>
            <Input
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              placeholder='例: @PetGadgets_Official 或 官方精选店'
              className='bg-background rounded-xl'
            />
          </div>
        </div>

        <div className='flex items-center justify-end gap-3 border-t pt-2'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='rounded-xl text-xs'
          >
            取消
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className='gap-1.5 rounded-xl px-5 text-xs font-bold'
          >
            {isConnecting && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            验证并保存授权
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
