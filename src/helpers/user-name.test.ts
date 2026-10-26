import { describe, expect, it } from 'vitest'
import { USER_NAME_MAX_LENGTH } from '~/constants/auth'
import { boundProviderName } from '~/helpers/user-name'

const ZERO_WIDTH_JOINER = '\u200D'
const COMBINING_ACUTE_ACCENT = '\u0301'
const FAMILY_EMOJI = `👨${ZERO_WIDTH_JOINER}👩${ZERO_WIDTH_JOINER}👧`

describe('boundProviderName', () => {
  it('should keep a short provider name as is', () => {
    const name = boundProviderName('Alan Turing')

    expect(name).toBe('Alan Turing')
  })

  it('should remove the spaces around the provider name', () => {
    const name = boundProviderName('  Alan  ')

    expect(name).toBe('Alan')
  })

  it('should cut a provider name longer than the maximum length', () => {
    const name = boundProviderName('a'.repeat(USER_NAME_MAX_LENGTH + 1))

    expect(name).toBe('a'.repeat(USER_NAME_MAX_LENGTH))
  })

  it('should drop an emoji that would cross the maximum length', () => {
    const name = boundProviderName(
      `${'a'.repeat(USER_NAME_MAX_LENGTH - 1)}${FAMILY_EMOJI}`
    )

    expect(name).toBe('a'.repeat(USER_NAME_MAX_LENGTH - 1))
  })

  it('should drop a letter stacked with marks past the maximum length', () => {
    const name = boundProviderName(
      `Alan${COMBINING_ACUTE_ACCENT.repeat(USER_NAME_MAX_LENGTH)}`
    )

    expect(name).toBe('Ala')
  })
})
