import { type KeyboardEvent, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type FilterSearchBarProps = {
  /** 搜索框左侧的筛选控件（下拉、时间等） */
  children?: ReactNode
  keyword: string
  onKeywordChange: (value: string) => void
  keywordPlaceholder?: string
  keywordClassName?: string
  onSearch: () => void
  onClear?: () => void
  showClear?: boolean
  className?: string
  searchLabel?: string
  clearLabel?: string
}

/**
 * 多条件筛选搜索栏：左侧放筛选条件，右侧为关键词与搜索按钮。
 * 仅点击搜索或在关键词输入框回车时触发 onSearch。
 */
export function FilterSearchBar({
  children,
  keyword,
  onKeywordChange,
  keywordPlaceholder = '搜索',
  keywordClassName,
  onSearch,
  onClear,
  showClear = false,
  className,
  searchLabel = '搜索',
  clearLabel = '清除',
}: FilterSearchBarProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSearch()
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
      <div className='relative'>
        <Search className='text-muted-foreground absolute top-1/2 start-2.5 size-4 -translate-y-1/2' />
        <Input
          value={keyword}
          placeholder={keywordPlaceholder}
          className={cn('w-80 ps-8', keywordClassName)}
          onChange={(event) => onKeywordChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <Button type='button' variant='outline' onClick={onSearch}>
        {searchLabel}
      </Button>
      {showClear && onClear ? (
        <Button type='button' variant='ghost' onClick={onClear}>
          {clearLabel}
        </Button>
      ) : null}
    </div>
  )
}
