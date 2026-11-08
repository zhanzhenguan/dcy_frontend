import assert from 'node:assert/strict'
import test from 'node:test'
import { groupByRelativeDate } from './groupByRelativeDate.ts'

test('groups items into today / yesterday / day-before / earlier labels', () => {
  const now = new Date('2026-09-02T15:00:00+08:00').getTime()
  const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)

  const items = [
    { id: 'a', createdAt: sec('2026-09-02T10:00:00+08:00') },
    { id: 'b', createdAt: sec('2026-09-01T10:00:00+08:00') },
    { id: 'c', createdAt: sec('2026-08-31T10:00:00+08:00') },
    { id: 'd', createdAt: sec('2026-08-20T10:00:00+08:00') },
    { id: 'e', createdAt: sec('2025-12-01T10:00:00+08:00') },
  ]

  const groups = groupByRelativeDate(items, (item) => item.createdAt, now)

  assert.deepEqual(
    groups.map((group) => ({
      label: group.label,
      ids: group.items.map((item) => item.id),
    })),
    [
      { label: '今天', ids: ['a'] },
      { label: '昨天', ids: ['b'] },
      { label: '前天', ids: ['c'] },
      { label: '08/20', ids: ['d'] },
      { label: '2025/12/01', ids: ['e'] },
    ]
  )
})
