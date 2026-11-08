import { createFileRoute } from '@tanstack/react-router'
import { CircleCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/(portal)/payment/result')({
  component: PaymentResultPage,
})

function PaymentResultPage() {
  return (
    <main className='bg-muted/30 flex min-h-svh items-center justify-center p-6'>
      <section className='bg-surface w-full max-w-sm border p-8 text-center shadow-sm'>
        <CircleCheck
          className='text-primary mx-auto size-12'
          aria-hidden='true'
        />
        <h1 className='mt-5 text-xl font-semibold'>支付请求已提交</h1>
        <p className='text-muted-foreground mt-3 text-sm leading-6'>
          支付结果正在确认，请返回原页面等待订单状态更新。
        </p>
        <Button className='mt-6 w-full' onClick={() => window.close()}>
          <X aria-hidden='true' />
          关闭页面
        </Button>
      </section>
    </main>
  )
}
