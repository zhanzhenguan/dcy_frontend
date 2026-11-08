import { QRCodeSVG } from 'qrcode.react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/utils/utils'
import {
  formatNodeExpiresAt,
  getNodeExpiryHint,
  isNodeExpiryAlert,
  type ManagedAccount,
} from '../types'

type NetworkIpDialogProps = {
  account: ManagedAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  remindDays: number
}

export const NetworkIpDialog = ({
  account,
  open,
  onOpenChange,
  remindDays,
}: NetworkIpDialogProps) => {
  if (!account) return null

  const hasNodeLink = Boolean(account.nodeLink)
  const hasLegacyQrImage = Boolean(account.nodeQrUrl) && !hasNodeLink
  const expiresLabel = formatNodeExpiresAt(account.nodeExpiresAt)
  const highlight = isNodeExpiryAlert(account.nodeExpiresAt, remindDays)
  const hint = getNodeExpiryHint(account.nodeExpiresAt, remindDays)

  const copyLink = async () => {
    if (!account.nodeLink) return
    try {
      await navigator.clipboard.writeText(account.nodeLink)
      toast.success('节点链接已复制')
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>网络 IP</DialogTitle>
          <DialogDescription>
            {account.name} · {account.networkIp}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col items-center gap-4 py-2'>
          {hasNodeLink ? (
            <div className='bg-background rounded-xl border p-3'>
              <QRCodeSVG value={account.nodeLink} size={180} includeMargin />
            </div>
          ) : hasLegacyQrImage ? (
            <div className='bg-background rounded-xl border p-3'>
              <img
                src={account.nodeQrUrl}
                alt='节点二维码'
                className='size-45 object-contain'
              />
            </div>
          ) : (
            <div className='text-muted-foreground flex h-44 w-44 items-center justify-center rounded-xl border border-dashed text-sm'>
              暂无节点二维码
            </div>
          )}

          <dl className='w-full space-y-3 text-sm'>
            <div className='grid grid-cols-[5rem_1fr] gap-2'>
              <dt className='text-muted-foreground'>节点名称</dt>
              <dd className='text-foreground font-medium'>
                {account.nodeName || '—'}
              </dd>
            </div>
            <div className='grid grid-cols-[5rem_1fr] gap-2'>
              <dt className='text-muted-foreground'>节点链接</dt>
              <dd className='min-w-0 break-all'>
                {hasNodeLink ? (
                  <a
                    href="javascript:void(0)"
                    rel='noreferrer'
                    className='text-primary inline-flex items-center gap-1 hover:underline'
                  >
                    {account.nodeLink}
                  </a>
                ) : hasLegacyQrImage ? (
                  '历史二维码图片（请重新解析）'
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className='grid grid-cols-[5rem_1fr] gap-2'>
              <dt className='text-muted-foreground'>续费到期日</dt>
              <dd
                className={cn(
                  'tabular-nums',
                  highlight ? 'text-destructive font-medium' : 'text-foreground'
                )}
              >
                {expiresLabel
                  ? `${expiresLabel}${hint ? `（${hint}）` : ''}`
                  : '—'}
              </dd>
            </div>
            <div className='grid grid-cols-[5rem_1fr] gap-2'>
              <dt className='text-muted-foreground'>网络 IP</dt>
              <dd className='font-mono text-sm'>{account.networkIp}</dd>
            </div>
          </dl>

          {hasNodeLink ? (
            <Button
              type='button'
              variant='outline'
              className='w-full gap-2'
              onClick={() => void copyLink()}
            >
              <Copy className='size-4' />
              复制节点链接
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
