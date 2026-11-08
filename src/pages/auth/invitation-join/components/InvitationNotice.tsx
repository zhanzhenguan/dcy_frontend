import { LoaderCircle, UserPlus } from 'lucide-react'

export const InvitationNotice = ({
  title,
  detail,
  loading = false,
}: {
  title: string
  detail: string
  loading?: boolean
}) => {
  return (
    <main className='bg-muted/30 flex min-h-screen items-center justify-center px-4'>
      <section className='bg-background w-full max-w-md border p-6 text-center shadow-sm'>
        {loading ? (
          <LoaderCircle className='text-primary mx-auto size-7 animate-spin' />
        ) : (
          <UserPlus className='text-muted-foreground mx-auto size-7' />
        )}
        <h1 className='mt-4 text-lg font-semibold'>{title}</h1>
        <p className='text-muted-foreground mt-2 text-sm'>{detail}</p>
      </section>
    </main>
  )
}

export function roleScope(scope: 'all' | 'group' | 'self') {
  return { all: '全部数据', group: '本组数据', self: '个人数据' }[scope]
}
