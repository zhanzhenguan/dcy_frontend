import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAdScriptGeneration } from './creativeApi'

test('normalizeAdScriptGeneration preserves Dify script titles for script cards', () => {
  const result = normalizeAdScriptGeneration(
    [
      { title: '痛点引出型', content: '脚本一' },
      { title: '卖点拆解型', content: '脚本二' },
      { title: '沉浸开箱型', content: '脚本三' },
      { title: '对比反转型', content: '脚本四' },
    ],
    15
  )

  assert.deepEqual(result, {
    summary: '',
    scripts: [
      { title: '痛点引出型', tag: 'AI 生成', duration: 15, content: '脚本一' },
      { title: '卖点拆解型', tag: 'AI 生成', duration: 15, content: '脚本二' },
      { title: '沉浸开箱型', tag: 'AI 生成', duration: 15, content: '脚本三' },
      { title: '对比反转型', tag: 'AI 生成', duration: 15, content: '脚本四' },
    ],
  })
})

test('normalizeAdScriptGeneration rejects an invalid Dify response', () => {
  assert.throws(
    () => normalizeAdScriptGeneration([{ title: '脚本一', content: '内容' }], 15),
    /响应格式错误/
  )
})
