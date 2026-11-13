import { describe, expect, it, vi } from 'vitest'
import { encodeFirstFrameWithinBudget } from '~/lib/first-frame'

const QUALITY = {
  best: 75,
  high: 60,
  medium: 45,
  low: 30
} as const

const IMAGE_BYTES_BY_QUALITY = {
  [QUALITY.best]: 1400,
  [QUALITY.high]: 1100,
  [QUALITY.medium]: 900,
  [QUALITY.low]: 700
} as const satisfies Record<number, number>

const THUMBNAIL_BYTES = 1000

const BUDGET_BELOW_EVERY_QUALITY_BYTES = 500

const encodeImage = async (quality: keyof typeof IMAGE_BYTES_BY_QUALITY) => {
  return new Uint8Array(IMAGE_BYTES_BY_QUALITY[quality])
}

describe('encodeFirstFrameWithinBudget', () => {
  it('should keep the best quality when it weighs no more than the thumbnail', async () => {
    const encode = vi.fn(encodeImage)

    const image = await encodeFirstFrameWithinBudget({
      encode,
      maxBytes: IMAGE_BYTES_BY_QUALITY[QUALITY.best]
    })

    expect(image.byteLength).toBe(IMAGE_BYTES_BY_QUALITY[QUALITY.best])
    expect(encode.mock.calls).toStrictEqual([[QUALITY.best]])
  })

  it('should lower the quality until the image weighs less than the thumbnail', async () => {
    const encode = vi.fn(encodeImage)

    const image = await encodeFirstFrameWithinBudget({
      encode,
      maxBytes: THUMBNAIL_BYTES
    })

    expect(image.byteLength).toBe(IMAGE_BYTES_BY_QUALITY[QUALITY.medium])
    expect(encode.mock.calls).toStrictEqual([
      [QUALITY.best],
      [QUALITY.high],
      [QUALITY.medium]
    ])
  })

  it('should keep the lightest image when no quality fits under the thumbnail', async () => {
    const image = await encodeFirstFrameWithinBudget({
      encode: encodeImage,
      maxBytes: BUDGET_BELOW_EVERY_QUALITY_BYTES
    })

    expect(image.byteLength).toBe(IMAGE_BYTES_BY_QUALITY[QUALITY.low])
  })
})
