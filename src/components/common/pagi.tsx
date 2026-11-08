import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { getPageNumbers } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 36, 48],
  className = '',
}: PaginationProps) => {
  if (totalItems <= 0) return null

  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div
      className={`flex flex-col items-center justify-between gap-4 py-4 sm:flex-row ${className}`}
    >
      <div className='text-muted-foreground flex items-center gap-4 text-xs'>
        <span>
          显示第{' '}
          <strong className='text-foreground font-semibold'>{startItem}</strong>{' '}
          - <strong className='text-foreground font-semibold'>{endItem}</strong>{' '}
          条，共{' '}
          <strong className='text-foreground font-semibold'>
            {totalItems}
          </strong>{' '}
          条
        </span>
        {onPageSizeChange && (
          <div className='flex items-center gap-1.5'>
            <Select
              value={`${pageSize}`}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className='h-8 w-[105px] text-xs'>
                <SelectValue placeholder={`每页 ${pageSize} 条`} />
              </SelectTrigger>
              <SelectContent side='top'>
                {pageSizeOptions.map((option) => (
                  <SelectItem
                    key={option}
                    value={`${option}`}
                    className='text-xs'
                  >
                    每页 {option} 条
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className='flex items-center space-x-1.5'>
        <Button
          variant='outline'
          size='icon'
          className='text-muted-foreground hover:text-foreground h-8 w-8'
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title='第一页'
        >
          <ChevronsLeft className='h-4 w-4' />
          <span className='sr-only'>第一页</span>
        </Button>
        <Button
          variant='outline'
          size='icon'
          className='text-muted-foreground hover:text-foreground h-8 w-8'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title='上一页'
        >
          <ChevronLeft className='h-4 w-4' />
          <span className='sr-only'>上一页</span>
        </Button>

        {pageNumbers.map((pageNumber, index) => (
          <div key={`${pageNumber}-${index}`} className='flex items-center'>
            {pageNumber === '...' ? (
              <span className='text-muted-foreground px-1.5 text-xs'>...</span>
            ) : (
              <Button
                variant={currentPage === pageNumber ? 'default' : 'outline'}
                className='h-8 min-w-8 px-2 text-xs font-medium'
                onClick={() => onPageChange(pageNumber as number)}
              >
                {pageNumber}
              </Button>
            )}
          </div>
        ))}

        <Button
          variant='outline'
          size='icon'
          className='text-muted-foreground hover:text-foreground h-8 w-8'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title='下一页'
        >
          <ChevronRight className='h-4 w-4' />
          <span className='sr-only'>下一页</span>
        </Button>
        <Button
          variant='outline'
          size='icon'
          className='text-muted-foreground hover:text-foreground h-8 w-8'
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title='最后一页'
        >
          <ChevronsRight className='h-4 w-4' />
          <span className='sr-only'>最后一页</span>
        </Button>
      </div>
    </div>
  )
}
