import { useEffect, useState, type FormEvent } from 'react'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ExpiryRemindDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  remindDays: number
  onSave: (days: number) => void
}

export const ExpiryRemindDialog = ({
  open,
  onOpenChange,
  remindDays,
  onSave,
}: ExpiryRemindDialogProps) => {
  const [days, setDays] = useState(String(remindDays))

  useEffect(() => {
    if (!open) return
    setDays(String(remindDays))
  }, [open, remindDays])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = Number.parseInt(days, 10)
    if (!Number.isFinite(next) || next < 0) {
      toast.error('请输入大于等于 0 的天数')
      return
    }
    onSave(next)
    toast.success(`已设置提前 ${next} 天提醒`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Bell className='size-4' />
            续费到期提醒
          </DialogTitle>
          <DialogDescription>
            设置提前几天进入提醒。进入该窗口后续费到期日会标红，并显示「还剩 N
            天 / 今天到期 / 已到期」。
          </DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit}>
          <div className='space-y-2'>
            <Label htmlFor='expiry-remind-days'>提前几天提醒</Label>
            <div className='flex items-center gap-2'>
              <Input
                id='expiry-remind-days'
                type='number'
                min={0}
                step={1}
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className='max-w-32'
              />
              <span className='text-muted-foreground text-sm'>天</span>
            </div>
            <p className='text-muted-foreground text-xs'>
              例如设为 7，则到期前 7 天起标红；设为 0 则仅到期当天及之后标红。
            </p>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type='submit'>保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
