import { useEffect, useState } from 'react'
import { Copy, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TenantRole } from '@/services/api/tenantApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const dataScopeLabel: Record<TenantRole['data_scope'], string> = {
  all: '全部数据',
  group: '本组数据',
  self: '个人数据',
}

type InviteTenantMemberDialogProps = {
  roles: TenantRole[]
  /** leader 仅可邀请普通成员 */
  isLeader?: boolean
  isPending?: boolean
  disabled?: boolean
  onCreate: (
    rolePublicId: string
  ) => Promise<{ code: string; expires_at: string }>
}

export const InviteTenantMemberDialog = ({
  roles,
  isLeader = false,
  isPending = false,
  disabled = false,
  onCreate,
}: InviteTenantMemberDialogProps) => {
  const [open, setOpen] = useState(false)
  const availableRoles = roles.filter((role) =>
    isLeader ? role.code === 'member' : role.code !== 'owner'
  )
  const memberRole = availableRoles.find((role) => role.code === 'member')
  const [rolePublicId, setRolePublicId] = useState('')
  const [link, setLink] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (!open) return
    if (isLeader && memberRole) {
      setRolePublicId(memberRole.public_id)
    }
  }, [open, isLeader, memberRole])

  async function createInvitation() {
    const targetRoleId =
      isLeader && memberRole ? memberRole.public_id : rolePublicId
    if (!targetRoleId) {
      toast.error(
        isLeader ? '当前企业未配置普通成员角色' : '请选择受邀成员的角色'
      )
      return
    }
    try {
      const invitation = await onCreate(targetRoleId)
      const url = new URL('/join', window.location.origin)
      url.searchParams.set('invite', invitation.code)
      setLink(url.toString())
      setExpiresAt(invitation.expires_at)
    } catch {
      // 错误提示由 mutation 统一处理。
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('邀请链接已复制')
    } catch {
      toast.error('复制失败，请手动复制链接')
    }
  }

  function resetDialog(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setRolePublicId('')
      setLink('')
      setExpiresAt('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetDialog}>
      <Button
        size='sm'
        disabled={disabled || availableRoles.length === 0}
        onClick={() => setOpen(true)}
      >
        <Link2 className='size-4' />
        邀请加入企业
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>邀请加入企业</DialogTitle>
          <DialogDescription>
            {isLeader
              ? '受邀角色固定为普通成员（member）。链接在有效期内可多次使用；未注册用户在邀请页一次完成注册并加入，已注册用户登录后接受邀请。'
              : '可选择除管理员外的全部角色。链接在有效期内可多次使用；未注册用户在邀请页一次完成注册并加入，已注册用户登录后接受邀请。'}
          </DialogDescription>
        </DialogHeader>
        {link ? (
          <div className='space-y-3'>
            <div className='bg-muted/40 rounded-md border px-3 py-2 text-sm break-all'>
              {link}
            </div>
            <p className='text-muted-foreground text-xs'>
              有效期至 {new Date(expiresAt).toLocaleString()}
            </p>
            <Button className='w-full' onClick={() => void copyLink()}>
              <Copy className='size-4' />
              复制邀请链接
            </Button>
          </div>
        ) : isLeader ? (
          <div className='bg-muted/40 rounded-md border px-3 py-2 text-sm'>
            受邀角色：{memberRole?.name ?? '普通成员'}
            {memberRole ? `，${dataScopeLabel[memberRole.data_scope]}` : ''}
          </div>
        ) : (
          <Select value={rolePublicId} onValueChange={setRolePublicId}>
            <SelectTrigger aria-label='选择受邀成员角色'>
              <SelectValue placeholder='选择成员角色' />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role.public_id} value={role.public_id}>
                  {role.name}，{dataScopeLabel[role.data_scope]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button variant='outline' onClick={() => resetDialog(false)}>
            关闭
          </Button>
          {!link && (
            <Button
              disabled={
                isPending || (isLeader ? !memberRole : !rolePublicId)
              }
              onClick={() => void createInvitation()}
            >
              生成链接
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
