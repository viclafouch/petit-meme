import { describe, expect, it } from 'vitest'
import { getVideoAspectRatio } from '~/routes/_public__root/memes/-lib/video-aspect-ratio'

describe('getVideoAspectRatio', () => {
  it.each([
    { shape: 'vertical', width: 1080, height: 1920, expected: '1080 / 1920' },
    { shape: 'square', width: 720, height: 720, expected: '720 / 720' },
    { shape: 'very wide', width: 2560, height: 1080, expected: '2560 / 1080' }
  ])(
    'should frame a $shape video in its own shape',
    ({ width, height, expected }) => {
      expect(getVideoAspectRatio({ width, height })).toBe(expected)
    }
  )

  it.each([
    { width: null, height: null },
    { width: 1080, height: null },
    { width: null, height: 1920 }
  ])(
    'should frame a video of unknown dimensions in 16:9 ($width x $height)',
    (dimensions) => {
      expect(getVideoAspectRatio(dimensions)).toBe('16 / 9')
    }
  )
})
