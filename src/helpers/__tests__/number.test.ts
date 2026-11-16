import { describe, expect, it } from 'vitest'
import { formatCount } from '~/helpers/number'

const VIEW_COUNT = 1_284_567

describe('formatCount', () => {
  it('should group the thousands of a view count', () => {
    expect(formatCount(VIEW_COUNT, 'fr', 'standard')).toBe(
      '1\u202F284\u202F567'
    )
    expect(formatCount(VIEW_COUNT, 'en', 'standard')).toBe('1,284,567')
  })

  it('should shorten a view count in a compact list', () => {
    expect(formatCount(VIEW_COUNT, 'fr', 'compact')).toBe('1,3\u00A0M')
    expect(formatCount(VIEW_COUNT, 'en', 'compact')).toBe('1.3M')
  })
})
