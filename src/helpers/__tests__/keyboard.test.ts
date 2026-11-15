import { describe, expect, it } from 'vitest'
import { matchIsImeComposing } from '~/helpers/keyboard'

describe('matchIsImeComposing', () => {
  it('should flag the Enter that confirms an IME conversion', () => {
    expect(
      matchIsImeComposing({ keyCode: 13, nativeEvent: { isComposing: true } })
    ).toBe(true)
  })

  it('should flag the Safari Enter that arrives after compositionend', () => {
    expect(
      matchIsImeComposing({ keyCode: 229, nativeEvent: { isComposing: false } })
    ).toBe(true)
  })

  it('should let a plain Enter through', () => {
    expect(
      matchIsImeComposing({ keyCode: 13, nativeEvent: { isComposing: false } })
    ).toBe(false)
  })
})
