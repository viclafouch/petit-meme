import { describe, expect, it } from 'vitest'
import { MemeFillStatus } from '~/db/generated/prisma/enums'
import { resolveFillNotice } from '../meme-fill'

const FILL = {
  status: MemeFillStatus.WAITING,
  suggestion: null,
  isStalled: false,
  isQueuedTonight: false
}

describe('resolveFillNotice', () => {
  it('shows the night queue for a waiting draft whose video is finished', () => {
    expect(
      resolveFillNotice({
        ...FILL,
        status: MemeFillStatus.WAITING,
        isStalled: true,
        isQueuedTonight: true
      })
    ).toBe('QUEUED_TONIGHT')
  })

  it('shows the night retry for a failed draft under the attempt limit', () => {
    expect(
      resolveFillNotice({
        ...FILL,
        status: MemeFillStatus.FAILED,
        isQueuedTonight: true
      })
    ).toBe('RETRIED_TONIGHT')
  })

  it('shows the night retry for a run stopped mid-run under the attempt limit', () => {
    expect(
      resolveFillNotice({
        ...FILL,
        status: MemeFillStatus.RUNNING,
        isStalled: true,
        isQueuedTonight: true
      })
    ).toBe('RETRIED_TONIGHT')
  })

  it('shows the failure for a failed draft the night no longer retries', () => {
    expect(resolveFillNotice({ ...FILL, status: MemeFillStatus.FAILED })).toBe(
      'FAILED'
    )
  })

  it('shows the failure for a run stopped mid-run at the attempt limit', () => {
    expect(
      resolveFillNotice({
        ...FILL,
        status: MemeFillStatus.RUNNING,
        isStalled: true
      })
    ).toBe('FAILED')
  })

  it('waits for the video while Bunny still encodes it', () => {
    expect(resolveFillNotice(FILL)).toBe('WAITING_VIDEO')
  })

  it('shows the failure once the wait for the video stalls', () => {
    expect(resolveFillNotice({ ...FILL, isStalled: true })).toBe('FAILED')
  })

  it('shows a run in progress', () => {
    expect(resolveFillNotice({ ...FILL, status: MemeFillStatus.RUNNING })).toBe(
      'RUNNING'
    )
  })

  it('shows a filled draft whose proposal waits for review', () => {
    expect(
      resolveFillNotice({
        ...FILL,
        status: MemeFillStatus.FILLED,
        suggestion: { fr: { title: 'Titre', description: '', keywords: [] } }
      })
    ).toBe('SUGGESTION_READY')
  })

  it('shows a filled draft', () => {
    expect(resolveFillNotice({ ...FILL, status: MemeFillStatus.FILLED })).toBe(
      'FILLED'
    )
  })
})
