import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gift, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createBenefitDefinition,
  deleteBenefitDefinition,
  grantTenantBenefit,
  listBenefitDefinitions,
  revokeTenantBenefit,
  updateBenefitDefinition,
  type TenantBenefit,
} from '@/services/api/benefitApi'

export function BenefitPanel() {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [definitionId, setDefinitionId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [granted, setGranted] = useState<TenantBenefit | null>(null)
  const definitions = useQuery({
    queryKey: ['benefit-definitions'],
    queryFn: listBenefitDefinitions,
  })
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ['benefit-definitions'] })
  const create = useMutation({
    mutationFn: createBenefitDefinition,
    onSuccess: () => {
      setCode('')
      setName('')
      refresh()
      toast.success('权益定义已创建')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '创建权益失败')),
  })
  const toggle = useMutation({
    mutationFn: ({
      id,
      name,
      status,
    }: {
      id: string
      name: string
      status: 'ACTIVE' | 'DISABLED'
    }) => updateBenefitDefinition(id, { name, status }),
    onSuccess: refresh,
    onError: (error) => toast.error(getApiErrorMessage(error, '更新权益失败')),
  })
  const remove = useMutation({
    mutationFn: deleteBenefitDefinition,
    onSuccess: refresh,
    onError: (error) => toast.error(getApiErrorMessage(error, '删除权益失败')),
  })
  const grant = useMutation({
    mutationFn: grantTenantBenefit,
    onSuccess: (item) => {
      setGranted(item)
      toast.success('权益已授予')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '授予权益失败')),
  })
  const revoke = useMutation({
    mutationFn: revokeTenantBenefit,
    onSuccess: (item) => {
      setGranted(item)
      toast.success('权益已撤销')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '撤销权益失败')),
  })

  const submitDefinition = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    create.mutate({ code: code.trim(), name: name.trim(), status: 'ACTIVE' })
  }
  const submitGrant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!tenantId.trim() || !definitionId) {
      toast.error('请填写租户 ID 并选择权益')
      return
    }
    grant.mutate({
      tenant_id: tenantId.trim(),
      benefit_definition_id: definitionId,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    })
  }

  return (
    <div className='grid gap-6 xl:grid-cols-2'>
      <section className='space-y-4 rounded-xl border p-5'>
        <div className='flex items-center gap-2 text-base font-semibold'>
          <Plus className='size-4 text-emerald-600' />
          权益定义
        </div>
        <form
          className='grid gap-3 sm:grid-cols-[1fr_1fr_auto]'
          onSubmit={submitDefinition}
        >
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder='编码，例如 VIDEO_4K'
          />
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder='权益名称'
          />
          <Button
            type='submit'
            size='icon'
            title='创建权益'
            disabled={create.isPending}
          >
            <Plus />
          </Button>
        </form>
        <div className='space-y-2'>
          {(definitions.data?.items ?? []).map((item) => (
            <div
              key={item.id}
              className='flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm'
            >
              <div className='min-w-0 flex-1'>
                <div className='truncate font-medium'>{item.name}</div>
                <div className='text-muted-foreground truncate font-mono text-xs'>
                  {item.code}
                </div>
              </div>
              <Badge
                variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}
              >
                {item.status}
              </Badge>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  toggle.mutate({
                    id: item.id,
                    name: item.name,
                    status: item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                  })
                }
              >
                {item.status === 'ACTIVE' ? '停用' : '启用'}
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                title='删除权益'
                onClick={() => remove.mutate(item.id)}
              >
                <Trash2 className='text-destructive' />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <form className='space-y-4 rounded-xl border p-5' onSubmit={submitGrant}>
        <div className='flex items-center gap-2 text-base font-semibold'>
          <Gift className='size-4 text-violet-600' />
          手动授予权益
        </div>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='benefit-tenant-id'>租户 ID</Label>
            <Input
              id='benefit-tenant-id'
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              inputMode='numeric'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='benefit-definition'>权益</Label>
            <Select value={definitionId} onValueChange={setDefinitionId}>
              <SelectTrigger id='benefit-definition'>
                <SelectValue placeholder='选择权益' />
              </SelectTrigger>
              <SelectContent>
                {(definitions.data?.items ?? [])
                  .filter((item) => item.status === 'ACTIVE')
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2 sm:col-span-2'>
            <Label htmlFor='benefit-expires-at'>失效时间</Label>
            <Input
              id='benefit-expires-at'
              type='datetime-local'
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
        </div>
        <Button type='submit' disabled={grant.isPending}>
          <Gift />
          授予权益
        </Button>
        {granted && (
          <div className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'>
            <span>
              {granted.benefit_name} · {granted.status}
            </span>
            {granted.status === 'ACTIVE' && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => revoke.mutate(granted.id)}
                disabled={revoke.isPending}
              >
                撤销
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
