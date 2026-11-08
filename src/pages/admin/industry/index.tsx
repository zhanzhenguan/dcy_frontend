import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, RefreshCw, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createIndustry,
  deleteIndustry,
  listAdminIndustries,
  updateIndustry,
  type Industry,
  type IndustryInput,
} from '@/services/api/industryApi'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common'
import { PageShell } from '@/components/layout/PageShell'

export const IndustryAdmin = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Industry | null | undefined>()
  const [deleting, setDeleting] = useState<Industry | null>(null)
  const query = useQuery({
    queryKey: ['admin-industries'],
    queryFn: listAdminIndustries,
  })
  const items = query.data?.items ?? []
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-industries'] })
    void queryClient.invalidateQueries({ queryKey: ['industries'] })
  }
  const deleteMutation = useMutation({
    mutationFn: deleteIndustry,
    onSuccess: () => {
      toast.success('行业已删除')
      setDeleting(null)
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除失败')),
  })

  return (
    <>
      <PageShell
        title='行业维护'
        description='维护灵感库筛选和灵感案例可选择的行业目录。'
        actions={
          <>
            <Button
              variant='outline'
              size='icon'
              title='刷新'
              disabled={query.isFetching}
              onClick={refresh}
            >
              <RefreshCw className={query.isFetching ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={() => setEditing(null)}>
              <Plus />
              新增行业
            </Button>
          </>
        }
        surfaceClassName='space-y-6'
      >
      {query.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm'>
          行业列表加载失败：{getApiErrorMessage(query.error)}
        </div>
      )}

      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>行业</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className='w-24 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <span className='bg-muted flex size-9 items-center justify-center rounded-md'>
                      <Tags className='size-4' />
                    </span>
                    <span className='font-medium'>{item.name}</span>
                  </div>
                </TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === 'listed' ? 'default' : 'secondary'}
                  >
                    {item.status === 'listed' ? '启用' : '停用'}
                  </Badge>
                </TableCell>
                <TableCell className='text-muted-foreground text-sm'>
                  {new Date(item.updated_at).toLocaleString('zh-CN')}
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      title='编辑'
                      onClick={() => setEditing(item)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      title='删除'
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className='text-destructive' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!query.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='text-muted-foreground h-28 text-center'
                >
                  暂无行业，请先新增。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </PageShell>

      {editing !== undefined && (
        <IndustryDialog
          industry={editing}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除行业'
        desc={`确认删除“${deleting?.name ?? ''}”？已被灵感案例引用的行业不能删除，可以编辑为停用。`}
        destructive
        confirmText='删除'
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  )
}

function IndustryDialog({
  industry,
  onClose,
  onSaved,
}: {
  industry: Industry | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(industry?.name ?? '')
  const [sortOrder, setSortOrder] = useState(String(industry?.sort_order ?? 10))
  const [listed, setListed] = useState(industry?.status !== 'unlisted')
  const mutation = useMutation({
    mutationFn: (input: IndustryInput) =>
      industry ? updateIndustry(industry.id, input) : createIndustry(input),
    onSuccess: () => {
      toast.success(industry ? '行业已更新' : '行业已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalizedName = name.trim()
    if (!normalizedName) {
      toast.error('请输入行业名称')
      return
    }
    mutation.mutate({
      name: normalizedName,
      status: listed ? 'listed' : 'unlisted',
      sort_order: Number(sortOrder) || 0,
    })
  }
  const nameChanged = Boolean(industry && industry.name.trim() !== name.trim())

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{industry ? '编辑行业' : '新增行业'}</DialogTitle>
          <DialogDescription>
            {nameChanged
              ? '保存新名称后，已关联灵感案例中的行业名称也会同步更新。'
              : '停用后不会出现在灵感库筛选和新建案例的可选列表中。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <Field id='industry-name' label='行业名称'>
            <Input
              id='industry-name'
              value={name}
              maxLength={32}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
          <Field id='industry-sort' label='排序'>
            <Input
              id='industry-sort'
              type='number'
              min='0'
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </Field>
          <div className='flex items-center gap-3'>
            <Switch
              id='industry-listed'
              checked={listed}
              onCheckedChange={setListed}
            />
            <Label htmlFor='industry-listed'>启用</Label>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '保存中' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
