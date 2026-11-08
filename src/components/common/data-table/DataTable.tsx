import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import { cn } from '@/utils/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from './pagi'

type DataTablePaginationVariant = 'simple' | 'full'

type DataTableProps<TData> = {
  table: TanstackTable<TData>
  emptyMessage?: string
  showPagination?: boolean
  paginationVariant?: DataTablePaginationVariant
  className?: string
}

export const DataTable = <TData,>({
  table,
  emptyMessage = '暂无数据',
  showPagination = true,
  paginationVariant = 'simple',
  className,
}: DataTableProps<TData>) => {
  const columnCount = table.getAllColumns().length

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='group/row'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className='text-muted-foreground h-24 text-center text-sm'
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination ? (
        <DataTablePagination
          table={table}
          variant={paginationVariant}
          className='mt-auto'
        />
      ) : null}
    </div>
  )
}
