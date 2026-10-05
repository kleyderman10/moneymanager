import { describe, it, expect } from 'vitest'
import { formatMoney, formatPercent } from './format'

describe('format', () => {
  it('formats money without decimals by default', () => {
    expect(formatMoney(1500, 'USD', 'en-US')).toBe('$1,500')
  })

  it('treats invalid values as zero', () => {
    expect(formatMoney('abc', 'USD', 'en-US')).toBe('$0')
  })

  it('formats percentages', () => {
    expect(formatPercent(12.34, 'en-US')).toBe('12.3%')
  })
})
