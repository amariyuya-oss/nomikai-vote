import { describe, it, expect } from 'vitest'
import { formatDateTime } from '../../lib/format'

describe('formatDateTime', () => {
  it('U01: JST オフセット付き日時を正しくフォーマットする', () => {
    const result = formatDateTime('2026-06-10T19:00:00+09:00')
    expect(result).toBe('2026/06/10 19:00')
  })

  it('U04: 月・日・時・分が1桁のときゼロ埋めする', () => {
    // 2026-01-01 00:05 UTC → ローカル時間依存のため形式のみ検証
    const result = formatDateTime('2026-01-01T00:05:00.000Z')
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/)
  })

  it('U02: 出力が YYYY/MM/DD HH:mm 形式である', () => {
    const result = formatDateTime('2026-06-10T10:30:00.000Z')
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/)
  })
})
