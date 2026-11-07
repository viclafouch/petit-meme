import { describe, expect, it } from 'vitest'
import { BUNNY_STATUS } from '~/constants/bunny'
import { matchIsVideoPlayable } from '~/utils/video'

describe('matchIsVideoPlayable', () => {
  it('should play a video once Bunny encoded one of its resolutions', () => {
    expect(matchIsVideoPlayable(BUNNY_STATUS.RESOLUTION_FINISHED)).toBe(true)
    expect(matchIsVideoPlayable(BUNNY_STATUS.FINISHED)).toBe(true)
  })

  it('should not play a video Bunny deleted', () => {
    expect(matchIsVideoPlayable(BUNNY_STATUS.VIDEO_DELETED)).toBe(false)
  })
})
