import type { InvoiceDetailFieldProps } from '../types'

export const InvoiceDetailField = ({
  label,
  value,
  mono,
  emphasis,
  fullWidth,
}: InvoiceDetailFieldProps) => (
  <>
    <dt
      className={`text-muted-foreground shrink-0 text-left text-sm leading-5 ${
        fullWidth ? 'sm:col-start-1' : ''
      }`}
    >
      {label}
    </dt>
    <dd
      className={`min-w-0 text-left text-sm leading-5 whitespace-pre-wrap break-words ${
        fullWidth ? 'sm:col-span-3' : ''
      } ${mono ? 'font-mono text-xs break-all' : ''} ${
        emphasis ? 'text-lg font-semibold tabular-nums' : 'font-medium'
      }`}
    >
      {value}
    </dd>
  </>
)
