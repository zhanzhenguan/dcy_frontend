import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type DatePickerProps = {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  /** date-fns 展示格式，默认 MMM d, yyyy */
  displayFormat?: string
  /** 禁用日期；默认禁用未来日期与 1900 之前 */
  disabled?: (date: Date) => boolean
  /** 下拉可选起始月；不传则跟随 react-day-picker 默认 */
  startMonth?: Date
  /** 下拉可选结束月；不传则默认可选至当年年底（无法选未来年） */
  endMonth?: Date
}

export const DatePicker = ({
  selected,
  onSelect,
  placeholder = 'Pick a date',
  className,
  displayFormat = 'MMM d, yyyy',
  disabled = (date: Date) =>
    date > new Date() || date < new Date('1900-01-01'),
  startMonth,
  endMonth,
}: DatePickerProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          data-empty={!selected}
          className={cn(
            'data-[empty=true]:text-muted-foreground w-[240px] justify-start text-start font-normal',
            className
          )}
        >
          {selected ? (
            format(selected, displayFormat)
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className='ms-auto h-4 w-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          captionLayout='dropdown'
          selected={selected}
          onSelect={onSelect}
          disabled={disabled}
          startMonth={startMonth}
          endMonth={endMonth}
          defaultMonth={selected}
        />
      </PopoverContent>
    </Popover>
  )
}
