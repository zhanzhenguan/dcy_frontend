import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronRight, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/utils/utils'
import type {
  EnterpriseScopeOption,
  EnterpriseScopeSection,
} from './types'

export type EnterpriseScopePickerProps = {
  value: string
  label: string
  placeholder?: string
  searchPlaceholder?: string
  icon?: ReactNode
  sections: EnterpriseScopeSection[]
  /** 置顶选项（如「仅自己」「我的账号」） */
  leadingOptions?: EnterpriseScopeOption[]
  /** 无搜索时默认是否全部展开 */
  defaultExpandAll?: boolean
  /** 平铺选项，不展示一级分组标题 */
  flat?: boolean
  active?: boolean
  className?: string
  /**
   * combobox：账户管理「选择账号」样式
   * filter：资产筛选条「范围」分段样式
   */
  variant?: 'combobox' | 'filter'
  onSelect: (option: EnterpriseScopeOption) => void
  /** filter 变体：清除选中（回到默认） */
  onClear?: () => void
}

function matchesQuery(keywords: string, query: string) {
  if (!query) return true
  return keywords.includes(query)
}

/** 企业分组 / 成员范围选择器（账户管理、资产列表共用） */
export const EnterpriseScopePicker = ({
  value,
  label,
  placeholder = '选择账号',
  searchPlaceholder = '搜索分组、账号…',
  icon,
  sections,
  leadingOptions = [],
  defaultExpandAll = false,
  flat = false,
  active,
  className,
  variant = 'combobox',
  onSelect,
  onClear,
}: EnterpriseScopePickerProps) => {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const query = keyword.trim().toLowerCase()
  const isSearching = Boolean(query)

  const filteredLeading = useMemo(() => {
    if (!query) return leadingOptions
    return leadingOptions.filter(
      (option) =>
        matchesQuery(option.keywords, query) ||
        option.label.toLowerCase().includes(query)
    )
  }, [leadingOptions, query])

  const filteredSections = useMemo(() => {
    return sections
      .map((section) => {
        const headingMatch =
          !query || section.heading.toLowerCase().includes(query)
        const selectMatch =
          section.selectOption &&
          (matchesQuery(section.selectOption.keywords, query) ||
            section.selectOption.label.toLowerCase().includes(query))
        return {
          ...section,
          options: headingMatch || selectMatch
            ? section.options
            : section.options.filter((option) =>
                matchesQuery(option.keywords, query)
              ),
        }
      })
      .filter(
        (section) =>
          section.options.length > 0 ||
          (section.selectOption &&
            (!query ||
              section.heading.toLowerCase().includes(query) ||
              matchesQuery(section.selectOption.keywords, query)))
      )
  }, [query, sections])

  const flatOptions = useMemo(
    () => [
      ...filteredLeading,
      ...filteredSections.flatMap((section) => {
        const items = [...section.options]
        if (section.selectOption) items.unshift(section.selectOption)
        return items
      }),
    ],
    [filteredLeading, filteredSections]
  )

  useEffect(() => {
    if (!open) {
      setKeyword('')
      return
    }
    if (flat) return
    if (isSearching) {
      setExpandedIds(filteredSections.map((section) => section.id))
      return
    }
    if (defaultExpandAll) {
      setExpandedIds(sections.map((section) => section.id))
      return
    }
    setExpandedIds([])
  }, [
    defaultExpandAll,
    filteredSections,
    flat,
    isSearching,
    open,
    sections,
  ])

  const toggleSection = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  const handlePick = (option: EnterpriseScopeOption) => {
    onSelect(option)
    setOpen(false)
    setKeyword('')
  }

  const renderOption = (option: EnterpriseScopeOption, nested?: boolean) => {
    const selected = option.value === value
    return (
      <CommandItem
        key={option.value}
        // value 必须唯一且可搜索；只用 label 时 cmdk 易误匹配导致点选失效
        value={`${option.value} ${option.label} ${option.keywords}`}
        className={cn('gap-2', nested && 'text-sm')}
        onSelect={() => handlePick(option)}
        onPointerDown={(event) => {
          // 避免 Popover 抢先失焦导致 onSelect 丢失
          event.preventDefault()
        }}
      >
        <Check
          className={cn(
            'size-4 shrink-0',
            selected ? 'text-primary opacity-100' : 'invisible'
          )}
        />
        <span className={cn('truncate', selected && 'text-primary font-medium')}>
          {option.label}
        </span>
      </CommandItem>
    )
  }

  const isEmpty = flat
    ? flatOptions.length === 0
    : filteredLeading.length === 0 && filteredSections.length === 0

  const panel = (
    <PopoverContent
      className={cn(
        'p-0',
        variant === 'filter'
          ? 'w-72'
          : 'w-[min(20rem,calc(100vw-2rem))]'
      )}
      align='start'
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={keyword}
          onValueChange={setKeyword}
          placeholder={searchPlaceholder}
        />
        <CommandList className='max-h-72'>
          {isEmpty ? (
            <div className='text-muted-foreground py-6 text-center text-sm'>
              未找到匹配项
            </div>
          ) : flat ? (
            <div className='space-y-0.5 p-1'>
              {flatOptions.map((option) => renderOption(option))}
            </div>
          ) : (
            <div className='space-y-0.5 p-1'>
              {filteredLeading.map((option) => renderOption(option))}
              {filteredSections.map((section) => {
                const expanded =
                  isSearching || expandedIds.includes(section.id)
                const sectionSelected =
                  Boolean(section.selectOption) &&
                  section.selectOption?.value === value
                return (
                  <Collapsible
                    key={section.id}
                    open={expanded}
                    onOpenChange={() => {
                      if (isSearching) return
                      toggleSection(section.id)
                    }}
                  >
                    {/* 与上方「所有 / 仅自己」同列：左 icon 槽 size-4，文案对齐 */}
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                        sectionSelected && 'bg-primary/10 text-primary'
                      )}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type='button'
                          className='text-muted-foreground hover:text-foreground flex size-4 shrink-0 items-center justify-center'
                          aria-label={expanded ? '折叠分组' : '展开分组'}
                        >
                          <ChevronRight
                            className={cn(
                              'size-3.5 opacity-60 transition-transform',
                              expanded && 'rotate-90'
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>
                      {section.selectOption ? (
                        <button
                          type='button'
                          className={cn(
                            'hover:text-foreground flex min-w-0 flex-1 items-center gap-2 text-left font-medium transition-colors',
                            sectionSelected && 'text-primary'
                          )}
                          onPointerDown={(event) => {
                            event.preventDefault()
                          }}
                          onClick={() => handlePick(section.selectOption!)}
                        >
                          <span className='min-w-0 flex-1 truncate'>
                            {section.heading}
                          </span>
                          <Check
                            className={cn(
                              'size-4 shrink-0',
                              sectionSelected
                                ? 'text-primary opacity-100'
                                : 'invisible'
                            )}
                          />
                        </button>
                      ) : (
                        <CollapsibleTrigger asChild>
                          <button
                            type='button'
                            className='text-muted-foreground hover:text-foreground min-w-0 flex-1 truncate text-left font-medium transition-colors'
                          >
                            {section.heading}
                          </button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    <CollapsibleContent>
                      {/* 相对一级文案列再缩进 */}
                      <div className='border-border/60 ms-6 mt-0.5 space-y-0.5 border-l pb-1 ps-2'>
                        {section.options.map((option) =>
                          renderOption(option, true)
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </CommandList>
      </Command>
    </PopoverContent>
  )

  const isFilter = variant === 'filter'
  const filterActive = isFilter && Boolean(active) && Boolean(onClear)

  if (filterActive) {
    return (
      <span className='bg-primary/10 text-primary inline-flex h-8 max-w-48 items-center gap-1 rounded-md py-0.5 ps-2.5 pe-1 text-sm font-medium'>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setKeyword('')
          }}
        >
          <PopoverTrigger asChild>
            <button
              type='button'
              className='min-w-0 truncate outline-none'
              aria-label={`查看：${label}`}
            >
              {label || placeholder}
            </button>
          </PopoverTrigger>
          {panel}
        </Popover>
        <button
          type='button'
          aria-label={`清除 ${label}`}
          className='bg-primary text-primary-foreground hover:bg-primary/90 inline-flex size-5 shrink-0 items-center justify-center rounded-full'
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onClear?.()
          }}
        >
          <X className='size-3' strokeWidth={2.5} />
        </button>
      </span>
    )
  }

  if (isFilter) {
    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setKeyword('')
        }}
      >
        <PopoverTrigger asChild>
          <button
            type='button'
            className={cn(
              'text-foreground hover:bg-muted/70 inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-sm font-medium transition-colors',
              className
            )}
            aria-label={placeholder}
          >
            {placeholder}
            <ChevronsUpDown className='text-muted-foreground size-3.5 opacity-60' />
          </button>
        </PopoverTrigger>
        {panel}
      </Popover>
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setKeyword('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn(
            'h-9 w-[min(100%,11.5rem)] shrink-0 justify-between gap-2 px-3 font-normal',
            'hover:border-primary/40 hover:bg-primary/5',
            (active || open) &&
              'border-primary bg-primary/5 text-primary ring-primary/20 ring-1',
            className
          )}
        >
          <span className='flex min-w-0 items-center gap-2'>
            {icon}
            {label ? (
              <span className='truncate'>{label}</span>
            ) : (
              <span className='text-muted-foreground truncate'>
                {placeholder}
              </span>
            )}
          </span>
          <ChevronsUpDown className='text-muted-foreground size-3.5 shrink-0 opacity-60' />
        </Button>
      </PopoverTrigger>
      {panel}
    </Popover>
  )
}
