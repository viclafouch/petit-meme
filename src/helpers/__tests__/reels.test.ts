import { describe, expect, it } from 'vitest'
import { MAX_REELS_SEED, REELS_PAGE_SIZE } from '~/constants/reels'
import {
  parseReelsPositionCookie,
  toNextReelsCursor,
  toReelsPositionCookie
} from '~/helpers/reels'

const SEED = 42

const SHORT_PAGE_LENGTH = 3

const LAST_MEME_PAGE_LENGTH = 1

describe('toNextReelsCursor', () => {
  it('should read the next page of the same shuffle after a full page', () => {
    expect(
      toNextReelsCursor({ seed: SEED, offset: 0 }, REELS_PAGE_SIZE)
    ).toStrictEqual({ seed: SEED, offset: REELS_PAGE_SIZE })
  })

  it('should start a new shuffle once the library has run out', () => {
    expect(
      toNextReelsCursor(
        { seed: SEED, offset: REELS_PAGE_SIZE },
        SHORT_PAGE_LENGTH
      )
    ).toStrictEqual({ seed: SEED + 1, offset: 0 })
  })

  it('should start a new shuffle when the last page landed exactly on the end', () => {
    expect(
      toNextReelsCursor({ seed: SEED, offset: REELS_PAGE_SIZE }, 0)
    ).toStrictEqual({ seed: SEED + 1, offset: 0 })
  })

  it('should end the feed when the library holds no Meme', () => {
    expect(toNextReelsCursor({ seed: SEED, offset: 0 }, 0)).toBeNull()
  })

  it('should wrap the seed around its upper bound', () => {
    expect(
      toNextReelsCursor(
        { seed: MAX_REELS_SEED, offset: REELS_PAGE_SIZE },
        LAST_MEME_PAGE_LENGTH
      )
    ).toStrictEqual({ seed: 0, offset: 0 })
  })
})

describe('parseReelsPositionCookie', () => {
  it('should read back the position it wrote', () => {
    const position = { seed: SEED, offset: SHORT_PAGE_LENGTH }

    expect(
      parseReelsPositionCookie(toReelsPositionCookie(position))
    ).toStrictEqual(position)
  })

  it.each([
    undefined,
    '',
    'abc',
    '42',
    '-1.0',
    '1.5.2',
    `${MAX_REELS_SEED + 1}.0`
  ])('should start a new shuffle from the cookie %s', (cookie) => {
    expect(parseReelsPositionCookie(cookie)).toBeNull()
  })
})
