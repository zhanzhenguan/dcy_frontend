/**
 * 手工 E2E：支付页 → 完成支付 → 倒计时自动跳转
 * 用法：node scripts/test-payment-flow.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.APP_URL || 'http://127.0.0.1:5173'
const now = Math.floor(Date.now() / 1000)

const fakeSession = {
  token_type: 'Bearer',
  access_token: 'test-access-token',
  access_token_expire_at: now + 3600,
  refresh_token: 'test-refresh-token',
  refresh_token_expire_at: now + 86400,
  user: {
    id: 'u-test',
    email: 'pay-test@example.com',
    nickname: '支付测试',
    avatar_url: '',
    email_verified: true,
    subscription_plan: 'Plus',
    role: 'user',
    is_super_admin: false,
  },
  credit_balance: 1000,
  tenant: {
    public_id: 't-test',
    tenant_type: 'ENTERPRISE',
    company_name: '厦门XX科技有限公司',
    logo_url: '',
    industry: '互联网',
    plan_id: 'plan-demo',
    billing_period: 'YEAR',
    status: 'active',
    role: 'owner',
  },
}

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
})
const page = await browser.newPage()
const errors = []

page.on('pageerror', (err) => errors.push(String(err)))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
})

// 避免假 token 触发 401 被踢回登录
await page.route('**/api/**', async (route) => {
  const url = route.request().url()
  let data = {}
  if (url.includes('/credit')) {
    data = { balance: 1000, items: [], total: 0 }
  } else if (url.includes('/rendering-engines')) {
    data = []
  } else if (url.includes('/tenants')) {
    data = [fakeSession.tenant]
  }
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 0, msg: 'ok', data }),
  })
})

await page.addInitScript((session) => {
  window.localStorage.setItem('video-pipeline-auth', JSON.stringify(session))
}, fakeSession)

try {
  const payUrl = `${BASE}/payment?callbackUrl=${encodeURIComponent('/dashboard')}&callbackCountdownSeconds=2`
  await page.goto(payUrl, { waitUntil: 'networkidle' })

  await page.getByRole('heading', { name: '订单支付' }).waitFor({ timeout: 15000 })
  console.log('[ok] 进入支付页', page.url())

  await page.getByRole('button', { name: '我已完成支付' }).click()
  await page.getByRole('heading', { name: '支付成功' }).waitFor({ timeout: 10000 })
  console.log('[ok] 支付完成成功页出现')

  const countdown = page.getByText(/秒后跳转回调地址/)
  await countdown.waitFor({ timeout: 5000 })
  console.log('[ok] 看到回调倒计时文案:', await countdown.textContent())

  const callbackHint = page.getByText('/dashboard')
  await callbackHint.first().waitFor({ timeout: 3000 })
  console.log('[ok] 展示回调地址 /dashboard')

  await page.waitForURL((url) => url.pathname.includes('/dashboard'), {
    timeout: 8000,
  })
  console.log('[ok] 已自动跳转到', page.url())

  if (!page.url().includes('/dashboard')) {
    throw new Error(`期望跳转到 /dashboard，实际为 ${page.url()}`)
  }

  console.log('\nPASS: 支付 → 支付完成 → 自动跳转 流程通过')
  if (errors.length) {
    console.log('\n(非致命控制台错误)', errors.slice(0, 5))
  }
  process.exitCode = 0
} catch (error) {
  console.error('\nFAIL:', error)
  await page.screenshot({ path: '/tmp/payment-flow-fail.png', fullPage: true })
  console.error('截图: /tmp/payment-flow-fail.png')
  console.error('当前 URL:', page.url())
  console.error('页面标题:', await page.title().catch(() => ''))
  const bodyText = await page.locator('body').innerText().catch(() => '')
  console.error('页面摘要:', bodyText.slice(0, 400))
  process.exitCode = 1
} finally {
  await browser.close()
}
