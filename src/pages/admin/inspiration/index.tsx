import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownUp,
  Brain,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import { listIndustries } from '@/services/api/industryApi'
import {
  createInspiration,
  deleteInspiration,
  listAdminInspirations,
  updateInspiration,
  updateInspirationStatus,
  uploadInspirationAsset,
  type Inspiration,
  type InspirationInput,
  type InspirationTimelineStep,
} from '@/services/api/inspirationApi'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog, AnimatedTabs } from '@/components/common'
import { PageShell } from '@/components/layout/PageShell'

const PLATFORMS = ['TikTok', 'Instagram', 'Amazon', 'Facebook', 'YouTube']
const COLORS = [
  { value: 'bg-rose-500 text-white', color: 'bg-rose-500' },
  { value: 'bg-emerald-500 text-white', color: 'bg-emerald-500' },
  { value: 'bg-violet-500 text-white', color: 'bg-violet-500' },
  { value: 'bg-blue-500 text-white', color: 'bg-blue-500' },
  { value: 'bg-amber-500 text-white', color: 'bg-amber-500' },
  { value: 'bg-red-600 text-white', color: 'bg-red-600' },
]

const EMPTY_STEP: InspirationTimelineStep = {
  timeframe: '',
  title: '',
  description: '',
  technique: '',
}

function emptyInput(defaultIndustry = ''): InspirationInput {
  return {
    brand: '',
    brand_code: '',
    brand_bg_color: COLORS[0].value,
    industry: defaultIndustry,
    platform: PLATFORMS[0],
    title: '',
    creative_strategy: '',
    tags: [],
    views: 0,
    ctr: 0,
    duration: 30,
    cover_image: '',
    video_url: '',
    hook: '',
    target_audience: '',
    visual_style: '',
    selling_points: [],
    timeline: [{ ...EMPTY_STEP }],
    full_script: '',
    ai_prompt: '',
    status: 'listed',
    sort_order: 10,
  }
}

function parseList(value: string) {
  return value
    .split(/[，,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export const InspirationAdmin = () => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'all' | Inspiration['status']>('all')
  const [editing, setEditing] = useState<Inspiration | null | undefined>()
  const [deleting, setDeleting] = useState<Inspiration | null>(null)
  const industriesQuery = useQuery({
    queryKey: ['industries'],
    queryFn: listIndustries,
  })
  const industries = (industriesQuery.data?.items ?? []).map(
    (item) => item.name
  )
  const listQuery = useQuery({
    queryKey: ['admin-inspirations', status],
    queryFn: () =>
      listAdminInspirations({ status: status === 'all' ? '' : status }),
  })
  const items = listQuery.data?.items ?? []

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-inspirations'] })
    void queryClient.invalidateQueries({ queryKey: ['inspirations'] })
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: Inspiration['status'] }) =>
      updateInspirationStatus(id, next),
    onSuccess: () => {
      toast.success('案例状态已更新')
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '状态更新失败')),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInspiration,
    onSuccess: () => {
      toast.success('灵感案例已删除')
      setDeleting(null)
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除失败')),
  })

  return (
    <>
      <PageShell
        title='灵感库维护'
        description='维护爆款案例、创意拆解、数据指标与上下架状态。'
        actions={
          <>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
            >
              <SelectTrigger className='w-28'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部状态</SelectItem>
                <SelectItem value='listed'>上架</SelectItem>
                <SelectItem value='unlisted'>下架</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              size='icon'
              title='刷新'
              disabled={listQuery.isFetching}
              onClick={refresh}
            >
              <RefreshCw
                className={listQuery.isFetching ? 'animate-spin' : ''}
              />
            </Button>
            <Button onClick={() => setEditing(null)}>
              <Plus />
              新增案例
            </Button>
          </>
        }
        surfaceClassName='space-y-6'
      >
      <div className='grid gap-4 border-b pb-4 sm:grid-cols-3'>
        <Metric label='当前案例' value={listQuery.data?.total ?? 0} />
        <Metric
          label='上架中'
          value={items.filter((item) => item.status === 'listed').length}
        />
        <Metric
          label='覆盖平台'
          value={new Set(items.map((item) => item.platform)).size}
        />
      </div>

      {industriesQuery.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm'>
          行业列表加载失败：{getApiErrorMessage(industriesQuery.error)}
        </div>
      )}

      {listQuery.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm'>
          加载失败：{getApiErrorMessage(listQuery.error)}
        </div>
      )}

      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>案例视频</TableHead>
              <TableHead>行业 / 平台</TableHead>
              <TableHead>播放量</TableHead>
              <TableHead>CTR</TableHead>
              <TableHead>时长</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className='w-40 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className='flex min-w-56 items-center gap-3'>
                    {item.video_url || item.cover_image ? (
                      <video
                        src={item.video_url || item.cover_image}
                        className='h-11 w-20 shrink-0 rounded bg-black object-cover'
                        muted
                        preload='metadata'
                      />
                    ) : (
                      <div className='bg-muted text-muted-foreground flex h-11 w-20 shrink-0 items-center justify-center rounded text-xs font-medium'>
                        <Video className='size-4' />
                      </div>
                    )}
                    <div className='min-w-0'>
                      <div className='truncate font-medium'>{item.title}</div>
                      <div className='text-muted-foreground mt-0.5 truncate text-xs'>
                        {item.brand}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className='text-sm'>{item.industry}</div>
                  <div className='text-muted-foreground text-xs'>
                    {item.platform}
                  </div>
                </TableCell>
                <TableCell>{item.views.toLocaleString()}</TableCell>
                <TableCell>{item.ctr}%</TableCell>
                <TableCell>{item.duration}s</TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === 'listed' ? 'default' : 'secondary'}
                  >
                    {item.status === 'listed' ? '上架' : '下架'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      title={item.status === 'listed' ? '下架' : '上架'}
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          id: item.id,
                          next:
                            item.status === 'listed' ? 'unlisted' : 'listed',
                        })
                      }
                    >
                      <ArrowDownUp />
                    </Button>
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
            {!listQuery.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-muted-foreground h-28 text-center'
                >
                  暂无灵感案例
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </PageShell>

      {editing !== undefined && (
        <InspirationDialog
          inspiration={editing}
          industries={industries}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除灵感案例'
        desc={`确定删除“${deleting?.title ?? ''}”吗？删除后无法恢复。`}
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className='flex items-center gap-3'>
      <span className='bg-muted flex size-10 items-center justify-center rounded-md'>
        <Brain className='size-5' />
      </span>
      <div>
        <div className='text-2xl font-semibold'>{value}</div>
        <div className='text-muted-foreground text-xs'>{label}</div>
      </div>
    </div>
  )
}

function InspirationDialog({
  inspiration,
  industries,
  onClose,
  onSaved,
}: {
  inspiration: Inspiration | null
  industries: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<InspirationInput>(
    inspiration ? { ...inspiration } : emptyInput(industries[0])
  )
  const [tagsText, setTagsText] = useState(form.tags.join('，'))
  const [sellingPointsText, setSellingPointsText] = useState(
    form.selling_points.join('\n')
  )
  const [dialogTab, setDialogTab] = useState('basic')
  const industryOptions =
    form.industry && !industries.includes(form.industry)
      ? [form.industry, ...industries]
      : industries
  const currentIndustryUnlisted =
    Boolean(form.industry) && !industries.includes(form.industry)

  const uploadMutation = useMutation({
    mutationFn: uploadInspirationAsset,
    onSuccess: ({ url }) => {
      setForm((current) => ({ ...current, video_url: url }))
      toast.success('视频素材已上传')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '视频上传失败')),
  })
  const saveMutation = useMutation({
    mutationFn: (input: InspirationInput) =>
      inspiration
        ? updateInspiration(inspiration.id, input)
        : createInspiration(input),
    onSuccess: () => {
      toast.success(inspiration ? '灵感案例已更新' : '灵感案例已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存失败')),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.industry) {
      toast.error('请先在行业维护中启用至少一个行业')
      return
    }
    saveMutation.mutate({
      ...form,
      cover_image: form.video_url,
      tags: parseList(tagsText),
      selling_points: parseList(sellingPointsText),
      views: Number(form.views),
      ctr: Number(form.ctr),
      duration: Number(form.duration),
      sort_order: Number(form.sort_order),
    })
  }

  const updateStep = (
    index: number,
    key: keyof InspirationTimelineStep,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      timeline: current.timeline.map((step, stepIndex) =>
        stepIndex === index ? { ...step, [key]: value } : step
      ),
    }))
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[94vh] overflow-y-auto sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>
            {inspiration ? '编辑灵感案例' : '新增灵感案例'}
          </DialogTitle>
          <DialogDescription>
            完整维护案例资料、视频地址与镜头时间轴。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <Tabs value={dialogTab} onValueChange={setDialogTab}>
            <AnimatedTabs
              fullWidth
              value={dialogTab}
              onValueChange={setDialogTab}
              items={[
                { value: 'basic', label: '基础资料' },
                { value: 'breakdown', label: '创意拆解' },
                { value: 'timeline', label: '镜头时间轴' },
              ]}
            />

            <TabsContent value='basic' className='space-y-4 pt-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='品牌名称'>
                  <Input
                    value={form.brand}
                    onChange={(e) =>
                      setForm({ ...form, brand: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label='品牌简称'>
                  <Input
                    value={form.brand_code}
                    maxLength={16}
                    onChange={(e) =>
                      setForm({ ...form, brand_code: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label='行业'>
                  <div className='space-y-2'>
                    <Select
                      value={form.industry}
                      onValueChange={(industry) =>
                        setForm({ ...form, industry })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择行业' />
                      </SelectTrigger>
                      <SelectContent>
                        {industryOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                            {item === form.industry && currentIndustryUnlisted
                              ? '（已停用）'
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!inspiration && industries.length === 0 && (
                      <p className='text-destructive text-xs'>
                        暂无启用行业，请先前往行业维护新增或启用行业。
                      </p>
                    )}
                  </div>
                </Field>
                <Field label='平台'>
                  <Select
                    value={form.platform}
                    onValueChange={(platform) => setForm({ ...form, platform })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label='案例标题'>
                <Input
                  value={form.title}
                  maxLength={255}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </Field>
              <Field label='创意策略'>
                <Textarea
                  value={form.creative_strategy}
                  maxLength={500}
                  onChange={(e) =>
                    setForm({ ...form, creative_strategy: e.target.value })
                  }
                  required
                />
              </Field>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='标签（逗号分隔）'>
                  <Input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    required
                  />
                </Field>
                <Field label='品牌标识颜色'>
                  <Select
                    value={form.brand_bg_color}
                    onValueChange={(brand_bg_color) =>
                      setForm({ ...form, brand_bg_color })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          <span className='flex items-center gap-2'>
                            <span
                              className={`size-3 rounded-sm ${item.color}`}
                            />
                            品牌色
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className='grid gap-4 sm:grid-cols-4'>
                <NumberField
                  label='播放量'
                  value={form.views}
                  min={0}
                  onChange={(views) => setForm({ ...form, views })}
                />
                <NumberField
                  label='CTR (%)'
                  value={form.ctr}
                  min={0}
                  max={100}
                  step={0.1}
                  onChange={(ctr) => setForm({ ...form, ctr })}
                />
                <NumberField
                  label='时长（秒）'
                  value={form.duration}
                  min={1}
                  max={3600}
                  onChange={(duration) => setForm({ ...form, duration })}
                />
                <NumberField
                  label='排序'
                  value={form.sort_order}
                  onChange={(sort_order) => setForm({ ...form, sort_order })}
                />
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='状态'>
                  <Select
                    value={form.status}
                    onValueChange={(status) =>
                      setForm({
                        ...form,
                        status: status as Inspiration['status'],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='listed'>上架</SelectItem>
                      <SelectItem value='unlisted'>下架</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label='视频地址'>
                <div className='flex gap-2'>
                  <Input
                    type='url'
                    value={form.video_url}
                    placeholder='输入视频网络地址或上传视频'
                    onChange={(e) =>
                      setForm({ ...form, video_url: e.target.value })
                    }
                    required
                  />
                  <label className='hover:bg-accent inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium'>
                    <Upload className='size-4' />
                    上传视频
                    <input
                      type='file'
                      accept='video/*,image/*'
                      className='hidden'
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        uploadMutation.mutate(e.target.files[0])
                      }
                    />
                  </label>
                </div>
                {form.video_url && (
                  <video
                    src={form.video_url}
                    controls
                    className='mt-2 aspect-video w-56 rounded-md border bg-black object-cover'
                  />
                )}
              </Field>
            </TabsContent>

            <TabsContent value='breakdown' className='space-y-4 pt-4'>
              <Field label='黄金钩子'>
                <Textarea
                  value={form.hook}
                  onChange={(e) => setForm({ ...form, hook: e.target.value })}
                  required
                />
              </Field>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='目标受众'>
                  <Textarea
                    value={form.target_audience}
                    onChange={(e) =>
                      setForm({ ...form, target_audience: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label='视觉风格'>
                  <Textarea
                    value={form.visual_style}
                    onChange={(e) =>
                      setForm({ ...form, visual_style: e.target.value })
                    }
                    required
                  />
                </Field>
              </div>
              <Field label='核心卖点（每行一项）'>
                <Textarea
                  value={sellingPointsText}
                  onChange={(e) => setSellingPointsText(e.target.value)}
                  className='min-h-24'
                  required
                />
              </Field>
              <Field label='完整脚本'>
                <Textarea
                  value={form.full_script}
                  onChange={(e) =>
                    setForm({ ...form, full_script: e.target.value })
                  }
                  className='min-h-40'
                  required
                />
              </Field>
              <Field label='AI 画面提示词'>
                <Textarea
                  value={form.ai_prompt}
                  onChange={(e) =>
                    setForm({ ...form, ai_prompt: e.target.value })
                  }
                  className='min-h-28'
                  required
                />
              </Field>
            </TabsContent>

            <TabsContent value='timeline' className='space-y-4 pt-4'>
              {form.timeline.map((step, index) => (
                <div
                  key={index}
                  className='space-y-3 border-b pb-4 last:border-b-0'
                >
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>
                      分镜 {index + 1}
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      title='删除分镜'
                      disabled={form.timeline.length === 1}
                      onClick={() =>
                        setForm({
                          ...form,
                          timeline: form.timeline.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <X />
                    </Button>
                  </div>
                  <div className='grid gap-3 sm:grid-cols-3'>
                    <Field label='时间段'>
                      <Input
                        value={step.timeframe}
                        placeholder='00:00 - 00:03'
                        onChange={(e) =>
                          updateStep(index, 'timeframe', e.target.value)
                        }
                        required
                      />
                    </Field>
                    <Field label='标题'>
                      <Input
                        value={step.title}
                        onChange={(e) =>
                          updateStep(index, 'title', e.target.value)
                        }
                        required
                      />
                    </Field>
                    <Field label='创作技巧'>
                      <Input
                        value={step.technique}
                        onChange={(e) =>
                          updateStep(index, 'technique', e.target.value)
                        }
                        required
                      />
                    </Field>
                  </div>
                  <Field label='画面说明'>
                    <Textarea
                      value={step.description}
                      onChange={(e) =>
                        updateStep(index, 'description', e.target.value)
                      }
                      required
                    />
                  </Field>
                </div>
              ))}
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  setForm({
                    ...form,
                    timeline: [...form.timeline, { ...EMPTY_STEP }],
                  })
                }
              >
                <Plus />
                新增分镜
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter className='mt-6'>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button
              type='submit'
              disabled={
                saveMutation.isPending ||
                uploadMutation.isPending ||
                !form.industry
              }
            >
              {saveMutation.isPending ? '保存中' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  ...props
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <Field label={label}>
      <Input
        type='number'
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        {...props}
      />
    </Field>
  )
}
