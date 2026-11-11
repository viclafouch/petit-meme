import { describe, expect, it } from 'vitest'
import { MemeFillStatus } from '~/db/generated/prisma/enums'
import { type RerunStart, resolveRerunDraftStep } from './ready-drafts-rerun'

const STARTED_AT = 1_000

const STARTED = {
  status: 'started',
  startedAt: STARTED_AT
} as const satisfies RerunStart

const FILLED = {
  fillStatus: MemeFillStatus.FILLED,
  hasSuggestion: false,
  isStalled: false
}

const POLLED_AFTER_START = STARTED_AT + 1

describe('resolveRerunDraftStep', () => {
  it('should show a started draft as running while the last poll predates its start', () => {
    expect(
      resolveRerunDraftStep({
        start: STARTED,
        fill: FILLED,
        fetchedAt: STARTED_AT - 1
      })
    ).toBe('running')
  })

  it('should show a draft rewritten in place once its run settles without a proposal', () => {
    expect(
      resolveRerunDraftStep({
        start: STARTED,
        fill: FILLED,
        fetchedAt: POLLED_AFTER_START
      })
    ).toBe('rewritten')
  })

  it('should show a proposal when the Creator had edited the draft', () => {
    expect(
      resolveRerunDraftStep({
        start: STARTED,
        fill: { ...FILLED, hasSuggestion: true },
        fetchedAt: POLLED_AFTER_START
      })
    ).toBe('proposed')
  })

  it('should show a failure for a run that failed, stalled or never started', () => {
    expect([
      resolveRerunDraftStep({
        start: STARTED,
        fill: { ...FILLED, fillStatus: MemeFillStatus.FAILED },
        fetchedAt: POLLED_AFTER_START
      }),
      resolveRerunDraftStep({
        start: STARTED,
        fill: {
          ...FILLED,
          fillStatus: MemeFillStatus.RUNNING,
          isStalled: true
        },
        fetchedAt: POLLED_AFTER_START
      }),
      resolveRerunDraftStep({
        start: { status: 'refused', reason: 'AI Assist n’a pas pu démarrer' },
        fill: undefined,
        fetchedAt: 0
      })
    ]).toStrictEqual(['failed', 'failed', 'failed'])
  })

  it('should show a failure for a started draft the last poll no longer finds', () => {
    expect(
      resolveRerunDraftStep({
        start: STARTED,
        fill: undefined,
        fetchedAt: POLLED_AFTER_START
      })
    ).toBe('failed')
  })

  it('should show a draft still waiting for its request as queued', () => {
    expect(
      resolveRerunDraftStep({
        start: { status: 'queued' },
        fill: undefined,
        fetchedAt: 0
      })
    ).toBe('queued')
  })
})
