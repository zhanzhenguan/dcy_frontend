import { useState, type FormEvent } from 'react'
import { Check, Pencil, Pipette, Plus, Tags, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/utils'
import {
  getStatusTagToneProps,
  normalizeHexColor,
  statusTagColorPresets,
  type AccountStatusTag,
} from '../types'

const DEFAULT_CUSTOM_HEX = '#64748B'

type StatusTagManageDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: AccountStatusTag[]
  onCreate: (tag: AccountStatusTag) => void
  onUpdate: (tag: AccountStatusTag) => void
  onDelete: (tagId: string) => void
}

export const StatusTagManageDialog = ({
  open,
  onOpenChange,
  tags,
  onCreate,
  onUpdate,
  onDelete,
}: StatusTagManageDialogProps) => {
  const [editing, setEditing] = useState<AccountStatusTag | null>(null)
  const [label, setLabel] = useState('')
  const [className, setClassName] = useState<string>(
    statusTagColorPresets[0].className
  )
  const [colorHex, setColorHex] = useState<string | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const resetForm = () => {
    setEditing(null)
    setLabel('')
    setClassName(statusTagColorPresets[0].className)
    setColorHex(undefined)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetForm()
      setDeletingId(null)
    }
    onOpenChange(next)
  }

  const startEdit = (tag: AccountStatusTag) => {
    setEditing(tag)
    setLabel(tag.label)
    if (tag.colorHex) {
      setColorHex(tag.colorHex)
      setClassName('')
    } else {
      setColorHex(undefined)
      setClassName(tag.className || statusTagColorPresets[0].className)
    }
  }

  const selectPreset = (presetClassName: string) => {
    setClassName(presetClassName)
    setColorHex(undefined)
  }

  const selectCustomHex = (hex: string) => {
    setColorHex(normalizeHexColor(hex))
    setClassName('')
  }

  const previewLabel = label.trim() || '标签预览'
  const previewTone = getStatusTagToneProps({ className, colorHex })
  const isCustomSelected = Boolean(colorHex)
  const customSwatchHex = colorHex ?? DEFAULT_CUSTOM_HEX

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) {
      toast.error('请输入标签名称')
      return
    }
    const duplicated = tags.some(
      (tag) =>
        tag.label === trimmed && (!editing || tag.id !== editing.id)
    )
    if (duplicated) {
      toast.error('已存在同名标签')
      return
    }
    const nextTag: AccountStatusTag = {
      id: editing?.id ?? `status-${Date.now()}`,
      label: trimmed,
      className: colorHex ? '' : className,
      colorHex,
    }
    if (editing) {
      onUpdate(nextTag)
    } else {
      onCreate(nextTag)
    }
    resetForm()
  }

  const deletingTag = tags.find((tag) => tag.id === deletingId)

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className='flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg'>
          <DialogHeader className='shrink-0 border-b px-6 pt-6 pb-4'>
            <DialogTitle className='flex items-center gap-2'>
              <Tags className='size-4' />
              状态标签
            </DialogTitle>
          </DialogHeader>

          <div className='min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4'>
            {tags.length === 0 ? (
              <div className='text-muted-foreground rounded-lg border border-dashed px-3 py-10 text-center text-sm'>
                暂无标签，可在下方新增
              </div>
            ) : (
              <ul className='space-y-2'>
                {tags.map((tag) => {
                  const isEditing = editing?.id === tag.id
                  const tone = getStatusTagToneProps(tag)
                  return (
                    <li
                      key={tag.id}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                        isEditing
                          ? 'border-primary/40 bg-primary/5'
                          : 'bg-background hover:bg-muted/30'
                      )}
                    >
                      <Badge
                        variant='secondary'
                        className={cn('border-0 font-normal', tone.className)}
                        style={tone.style}
                      >
                        {tag.label}
                      </Badge>
                      <div className='flex shrink-0 items-center gap-0.5'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='size-8'
                          title='编辑'
                          onClick={() => startEdit(tag)}
                        >
                          <Pencil className='size-3.5' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='text-destructive hover:text-destructive size-8'
                          title='删除'
                          onClick={() => setDeletingId(tag.id)}
                        >
                          <Trash2 className='size-3.5' />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <form
            className='bg-surface shrink-0 space-y-4 border-t px-6 py-4'
            onSubmit={handleSubmit}
          >
            <div className='flex items-center justify-between gap-3'>
              <Label htmlFor='status-tag-label' className='shrink-0'>
                {editing ? '编辑标签' : '新增标签'}
              </Label>
              <Badge
                variant='secondary'
                className={cn('border-0 font-normal', previewTone.className)}
                style={previewTone.style}
              >
                {previewLabel}
              </Badge>
            </div>

            <Input
              id='status-tag-label'
              value={label}
              maxLength={32}
              placeholder='例如：限流、被盗号'
              onChange={(event) => setLabel(event.target.value)}
            />

            <div className='space-y-2'>
              <Label>颜色</Label>
              <div className='flex flex-wrap items-center gap-2'>
                {statusTagColorPresets.map((preset) => {
                  const selected =
                    !isCustomSelected && className === preset.className
                  return (
                    <button
                      key={preset.id}
                      type='button'
                      title={preset.label}
                      aria-label={preset.label}
                      aria-pressed={selected}
                      className={cn(
                        'relative flex size-8 items-center justify-center rounded-full border transition',
                        preset.className,
                        selected
                          ? 'border-foreground/30 ring-ring ring-2 ring-offset-2'
                          : 'border-transparent hover:opacity-90'
                      )}
                      onClick={() => selectPreset(preset.className)}
                    >
                      {selected ? <Check className='size-3.5' /> : null}
                    </button>
                  )
                })}

                <label
                  title='自定义颜色'
                  aria-label='自定义颜色'
                  className={cn(
                    'relative flex size-8 cursor-pointer items-center justify-center rounded-full border transition',
                    isCustomSelected
                      ? 'border-foreground/30 ring-ring ring-2 ring-offset-2'
                      : 'border-border hover:opacity-90'
                  )}
                  style={{ backgroundColor: `${customSwatchHex}26` }}
                >
                  <input
                    type='color'
                    className='absolute inset-0 cursor-pointer opacity-0'
                    value={customSwatchHex}
                    onChange={(event) => selectCustomHex(event.target.value)}
                    onClick={() => {
                      if (!isCustomSelected) {
                        selectCustomHex(DEFAULT_CUSTOM_HEX)
                      }
                    }}
                  />
                  {isCustomSelected ? (
                    <Check
                      className='pointer-events-none size-3.5'
                      style={{ color: customSwatchHex }}
                    />
                  ) : (
                    <Pipette className='text-muted-foreground pointer-events-none size-3.5' />
                  )}
                </label>
              </div>
            </div>

            <DialogFooter className='gap-2 sm:justify-end'>
              {editing ? (
                <Button type='button' variant='outline' onClick={resetForm}>
                  <X className='size-4' />
                  取消编辑
                </Button>
              ) : null}
              <Button type='submit' className='gap-1.5'>
                {editing ? (
                  <>
                    <Check className='size-4' />
                    保存
                  </>
                ) : (
                  <>
                    <Plus className='size-4' />
                    新增
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingId)}
        onOpenChange={(next) => {
          if (!next) setDeletingId(null)
        }}
        title='删除状态标签'
        desc={
          deletingTag
            ? `确定删除「${deletingTag.label}」？已使用该标签的账号会自动移除对应状态。`
            : '删除后，已使用该标签的账号将自动移除对应状态。'
        }
        confirmText='删除'
        cancelBtnText='取消'
        destructive
        handleConfirm={() => {
          if (deletingId) {
            if (editing?.id === deletingId) resetForm()
            onDelete(deletingId)
          }
          setDeletingId(null)
        }}
      />
    </>
  )
}
