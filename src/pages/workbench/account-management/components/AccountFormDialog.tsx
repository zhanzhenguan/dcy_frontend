import { useEffect, useRef, useState, type FormEvent } from 'react'
import { format, parse } from 'date-fns'
import { ChevronsUpDown, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/common'
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseManagedAccountNodeQr } from '@/services/api/managedAccountApi'
import { cn } from '@/utils/utils'
import {
  formatFollowerCount,
  getStatusTagToneProps,
  parseFollowerInput,
  resolveAccountStatusTags,
  toDateInputValue,
  type AccountStatusTag,
  type ManagedAccount,
} from '../types'

type NodeSource = 'link' | 'qr'

type AccountFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  statusTags: AccountStatusTag[]
  /** 传入则为编辑；不传则为新增 */
  account?: ManagedAccount | null
  onSubmit: (account: ManagedAccount) => void
}

const regions = ['US', 'UK', 'DE', 'JP', 'SG', 'AU']
const accountTypes = ['带货达人号', '店铺渠道号', '店铺官方号']

const emptyForm = {
  name: '',
  region: 'US',
  accountType: '带货达人号',
  email: '',
  password: '',
  twoFactorSecret: '',
  followers: '0',
  deviceSerial: '',
  networkIp: '',
  nodeName: '',
  nodeLink: '',
  nodeExpiresAt: '',
  remark: '',
}

export const AccountFormDialog = ({
  open,
  onOpenChange,
  statusTags,
  account,
  onSubmit,
}: AccountFormDialogProps) => {
  const isEdit = Boolean(account)
  const defaultStatusId = statusTags[0]?.id
  const [name, setName] = useState(emptyForm.name)
  const [region, setRegion] = useState(emptyForm.region)
  const [accountType, setAccountType] = useState(emptyForm.accountType)
  const [email, setEmail] = useState(emptyForm.email)
  const [password, setPassword] = useState(emptyForm.password)
  const [twoFactorSecret, setTwoFactorSecret] = useState(emptyForm.twoFactorSecret)
  const [followers, setFollowers] = useState(emptyForm.followers)
  const [deviceSerial, setDeviceSerial] = useState(emptyForm.deviceSerial)
  const [networkIp, setNetworkIp] = useState(emptyForm.networkIp)
  const [nodeName, setNodeName] = useState(emptyForm.nodeName)
  const [nodeLink, setNodeLink] = useState(emptyForm.nodeLink)
  const [nodeExpiresAt, setNodeExpiresAt] = useState(emptyForm.nodeExpiresAt)
  const [nodeSource, setNodeSource] = useState<NodeSource>('link')
  const [qrParsing, setQrParsing] = useState(false)
  const [statuses, setStatuses] = useState<string[]>(
    defaultStatusId ? [defaultStatusId] : []
  )
  const [remark, setRemark] = useState(emptyForm.remark)
  const qrFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (account) {
      setName(account.name)
      setRegion(account.region)
      setAccountType(account.accountType)
      setEmail(account.email || '')
      setPassword(account.password || '')
      setTwoFactorSecret(account.twoFactorSecret || '')
      setFollowers(String(account.followers))
      setDeviceSerial(
        account.deviceSerial === '—' ? '' : account.deviceSerial
      )
      setNetworkIp(
        account.networkIp === '未分配' ? '' : account.networkIp
      )
      setNodeName(account.nodeName)
      setNodeLink(account.nodeLink)
      setNodeExpiresAt(toDateInputValue(account.nodeExpiresAt))
      setNodeSource(account.nodeLink ? 'link' : account.nodeQrUrl ? 'qr' : 'link')
      setStatuses(
        account.statuses.filter((id) =>
          statusTags.some((tag) => tag.id === id)
        )
      )
      setRemark(account.remark ?? '')
      return
    }
    setName(emptyForm.name)
    setRegion(emptyForm.region)
    setAccountType(emptyForm.accountType)
    setEmail(emptyForm.email)
    setPassword(emptyForm.password)
    setTwoFactorSecret(emptyForm.twoFactorSecret)
    setFollowers(emptyForm.followers)
    setDeviceSerial(emptyForm.deviceSerial)
    setNetworkIp(emptyForm.networkIp)
    setNodeName(emptyForm.nodeName)
    setNodeLink(emptyForm.nodeLink)
    setNodeExpiresAt(emptyForm.nodeExpiresAt)
    setNodeSource('link')
    setStatuses(defaultStatusId ? [defaultStatusId] : [])
    setRemark(emptyForm.remark)
  }, [account, defaultStatusId, open, statusTags])

  const toggleStatus = (value: string, checked: boolean) => {
    setStatuses((current) => {
      if (checked) {
        if (current.includes(value)) return current
        return statusTags
          .map((tag) => tag.id)
          .filter((id) => id === value || current.includes(id))
      }
      return current.filter((item) => item !== value)
    })
  }

  const selectedStatusTags = resolveAccountStatusTags(statuses, statusTags)

  const handleQrUpload = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片格式的二维码')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('二维码图片不能超过 5MB')
      return
    }
    setQrParsing(true)
    try {
      const link = await parseManagedAccountNodeQr(file)
      setNodeLink(link)
      toast.success('已解析二维码链接')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '二维码解析失败')
    } finally {
      setQrParsing(false)
    }
  }

  const clearQr = () => {
    setNodeLink('')
    if (qrFileInputRef.current) qrFileInputRef.current.value = ''
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      toast.error('请填写邮箱')
      return
    }
    const trimmedPassword = password.trim()
    if (!trimmedPassword) {
      toast.error('请填写密码')
      return
    }
    const trimmedTwoFactorSecret = twoFactorSecret.trim()
    if (!trimmedTwoFactorSecret) {
      toast.error('请填写2FA密钥')
      return
    }
    if (statuses.length === 0) {
      toast.error('请至少选择一个状态')
      return
    }

    const followerCount = parseFollowerInput(followers)
    if (followerCount === null) {
      toast.error('粉丝数格式不正确，可填数字或带单位（如 128.6K、1.5M）')
      return
    }
    const trimmedLink = nodeLink.trim()
    const next: ManagedAccount = {
      id: account?.id ?? `acc-${Date.now()}`,
      name: trimmedName.replace(/^@/, ''),
      avatarUrl: account?.avatarUrl,
      region,
      platform: account?.platform ?? 'Tiktok商城',
      accountType,
      email: trimmedEmail,
      password: trimmedPassword,
      twoFactorSecret: trimmedTwoFactorSecret,
      followers: Math.max(0, followerCount),
      deviceSerial: deviceSerial.trim() || '—',
      networkIp: networkIp.trim() || '未分配',
      nodeName: nodeName.trim(),
      // 上传二维码解析后也写入 nodeLink，由前端生成二维码；不再持久化原图
      nodeLink: trimmedLink,
      nodeQrUrl: undefined,
      nodeExpiresAt: nodeExpiresAt || undefined,
      statuses,
      tags: account?.tags ?? [],
      remark: remark.trim() || undefined,
      storeLinked: account?.storeLinked ?? false,
      ownerUserId: account?.ownerUserId ?? 'self',
    }
    onSubmit(next)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[800px]'>
        <DialogHeader className='shrink-0 border-b px-6 pt-6 pb-4'>
          <DialogTitle>{isEdit ? '编辑账号' : '新增账号'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? '修改账号信息后保存即可生效。'
              : '填写账号基础信息，后续可再关联店铺与节点。'}
          </DialogDescription>
        </DialogHeader>

        <form
          className='flex min-h-0 flex-1 flex-col'
          onSubmit={handleSubmit}
        >
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='account-name'>账号名称</Label>
            <Input
              id='account-name'
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder='例如：twyla2553'
            />
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label>地区</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='选择地区' />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>账号类型</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='选择类型' />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='account-email'>
                邮箱 <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='account-email'
                type='email'
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder='例如：user@example.com'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='account-password'>
                密码 <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='account-password'
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder='请输入账号密码'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='account-2fa'>
              2FA密钥 <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='account-2fa'
              required
              value={twoFactorSecret}
              onChange={(event) => setTwoFactorSecret(event.target.value)}
              placeholder='请输入2FA双重验证密钥'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='account-followers'>粉丝数</Label>
            <Input
              id='account-followers'
              inputMode='decimal'
              value={followers}
              onChange={(event) => setFollowers(event.target.value)}
              placeholder='例如 128600 或 128.6K'
            />
            {(() => {
              const parsed = parseFollowerInput(followers)
              if (parsed === null) {
                return (
                  <p className='text-destructive text-xs'>
                    格式不正确，支持数字或 K / M / B / T
                  </p>
                )
              }
              if (!followers.trim()) return null
              return (
                <p className='text-muted-foreground text-xs'>
                  列表显示为{' '}
                  <span className='text-foreground font-medium tabular-nums'>
                    {formatFollowerCount(parsed)}
                  </span>
                  {parsed >= 1000 ? (
                    <span className='ms-1'>({parsed.toLocaleString('en-US')})</span>
                  ) : null}
                </p>
              )
            })()}
          </div>

          <div className='space-y-2'>
            <Label>状态</Label>
            {statusTags.length === 0 ? (
              <p className='text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm'>
                状态标签加载失败，请刷新后重试
              </p>
            ) : (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-auto min-h-9 w-full justify-between gap-2 px-3 py-2 font-normal'
                  >
                    <span className='flex min-w-0 flex-1 flex-wrap gap-1.5'>
                      {selectedStatusTags.length > 0 ? (
                        selectedStatusTags.map((tag) => {
                          const tone = getStatusTagToneProps(tag)
                          return (
                            <span
                              key={tag.id}
                              className={cn(
                                'rounded px-1.5 py-0.5 text-xs',
                                tone.className
                              )}
                              style={tone.style}
                            >
                              {tag.label}
                            </span>
                          )
                        })
                      ) : (
                        <span className='text-muted-foreground'>
                          请选择状态（可多选）
                        </span>
                      )}
                    </span>
                    <ChevronsUpDown className='text-muted-foreground size-4 shrink-0 opacity-50' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align='start'
                  className='w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto'
                >
                  {statusTags.map((tag) => {
                    const tone = getStatusTagToneProps(tag)
                    return (
                      <DropdownMenuCheckboxItem
                        key={tag.id}
                        checked={statuses.includes(tag.id)}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) =>
                          toggleStatus(tag.id, checked === true)
                        }
                      >
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-xs',
                            tone.className
                          )}
                          style={tone.style}
                        >
                          {tag.label}
                        </span>
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='account-device'>设备编号</Label>
            <Input
              id='account-device'
              value={deviceSerial}
              onChange={(event) => setDeviceSerial(event.target.value)}
              placeholder='选填'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='account-ip'>网络 IP</Label>
            <Input
              id='account-ip'
              value={networkIp}
              onChange={(event) => setNetworkIp(event.target.value)}
              placeholder='选填'
            />
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='account-node-name'>节点名称</Label>
              <Input
                id='account-node-name'
                value={nodeName}
                onChange={(event) => setNodeName(event.target.value)}
                placeholder='选填'
              />
            </div>
            <div className='space-y-2'>
              <Label>节点续费到期日</Label>
              <DatePicker
                selected={
                  nodeExpiresAt
                    ? parse(nodeExpiresAt, 'yyyy-MM-dd', new Date())
                    : undefined
                }
                onSelect={(date) =>
                  setNodeExpiresAt(date ? format(date, 'yyyy-MM-dd') : '')
                }
                placeholder='年 / 月 / 日'
                displayFormat='yyyy/MM/dd'
                className='w-full'
                // 包年续费需可选未来日期；年份下拉扩展到未来 10 年
                disabled={(date) => date < new Date('1900-01-01')}
                startMonth={new Date(2000, 0)}
                endMonth={new Date(new Date().getFullYear() + 10, 11)}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label>节点链接 / 二维码</Label>
            <Tabs
              value={nodeSource}
              onValueChange={(value) => setNodeSource(value as NodeSource)}
            >
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='link'>填写链接</TabsTrigger>
                <TabsTrigger value='qr'>上传二维码</TabsTrigger>
              </TabsList>
              <TabsContent value='link' className='mt-3'>
                <Input
                  id='account-node-link'
                  type='url'
                  value={nodeLink}
                  onChange={(event) => setNodeLink(event.target.value)}
                  placeholder='https://...'
                />
              </TabsContent>
              <TabsContent value='qr' className='mt-3 space-y-3'>
                {nodeLink ? (
                  <div className='flex flex-col items-center gap-3 rounded-lg border p-4'>
                    <div className='bg-background rounded-md border p-2'>
                      <QRCodeSVG value={nodeLink} size={160} includeMargin />
                    </div>
                    <p className='text-muted-foreground max-w-full break-all text-center text-xs'>
                      {nodeLink}
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={qrParsing}
                        onClick={() => qrFileInputRef.current?.click()}
                      >
                        重新上传
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='text-destructive'
                        disabled={qrParsing}
                        onClick={clearQr}
                      >
                        <Trash2 className='size-3.5' />
                        移除
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type='button'
                    disabled={qrParsing}
                    className='border-muted-foreground/30 text-muted-foreground hover:border-primary/40 hover:bg-muted/40 flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-sm transition-colors disabled:opacity-60'
                    onClick={() => qrFileInputRef.current?.click()}
                  >
                    {qrParsing ? (
                      <Loader2 className='size-6 animate-spin' />
                    ) : (
                      <ImagePlus className='size-6' />
                    )}
                    <span>
                      {qrParsing ? '正在解析二维码…' : '点击上传二维码图片'}
                    </span>
                    <span className='text-xs'>
                      支持 PNG、JPG、WebP，不超过 5MB；解析后自动生成二维码
                    </span>
                  </button>
                )}
                <input
                  ref={qrFileInputRef}
                  type='file'
                  accept='image/png,image/jpeg,image/webp'
                  className='hidden'
                  onChange={(event) => {
                    void handleQrUpload(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='account-remark'>备注</Label>
            <Textarea
              id='account-remark'
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder='选填，可填写账号相关说明'
              rows={3}
            />
          </div>
          </div>

          <DialogFooter className='shrink-0 border-t bg-surface px-6 py-4 sm:justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type='submit' disabled={qrParsing}>
              {isEdit ? '保存' : '新增'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
