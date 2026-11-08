import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import { cancelInvoice } from '@/services/api/invoiceApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { CancelInvoiceDialogProps } from '../types'

export const CancelInvoiceDialog = ({
  open,
  onOpenChange,
  applicationNo,
  scope,
  onSuccess,
}: CancelInvoiceDialogProps) => {
  const cancelMutation = useMutation({
    mutationFn: () => cancelInvoice(applicationNo, scope),
    onSuccess: () => {
      toast.success('已取消开票申请')
      onOpenChange(false)
      onSuccess()
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '取消开票申请失败')),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !cancelMutation.isPending) onOpenChange(false)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>取消开票申请</DialogTitle>
          <DialogDescription>
            确定取消申请单「{applicationNo}」吗？取消后订单额度将立即释放，可重新选择订单提交新申请。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            disabled={cancelMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            返回
          </Button>
          <Button
            type='button'
            variant='destructive'
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            {cancelMutation.isPending ? '取消中...' : '确认取消'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
