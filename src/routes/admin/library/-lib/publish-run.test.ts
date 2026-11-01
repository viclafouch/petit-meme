import { describe, expect, it } from 'vitest'
import {
  getPublishRunSteps,
  getPublishRunTarget,
  getPublishStepStatus,
  pacePublishRun,
  type PublishRun
} from './publish-run'

const getStatuses = (run: PublishRun) => {
  return getPublishRunSteps(run.kind).map((step) => {
    return getPublishStepStatus(run, step)
  })
}

describe('getPublishRunSteps', () => {
  it('runs the four file steps then the save on a first publish', () => {
    expect(getPublishRunSteps('publish')).toStrictEqual([
      'preparing',
      'watermarking',
      'extracting-mp3',
      'uploading',
      'saving'
    ])
  })

  it('runs the four file steps without saving on a regeneration', () => {
    expect(getPublishRunSteps('regenerate')).toStrictEqual([
      'preparing',
      'watermarking',
      'extracting-mp3',
      'uploading'
    ])
  })
})

describe('getPublishStepStatus', () => {
  it('marks the steps before the current one as done and the next ones as pending', () => {
    expect(
      getStatuses({
        kind: 'publish',
        step: 'watermarking',
        outcome: 'running'
      })
    ).toStrictEqual(['done', 'active', 'pending', 'pending', 'pending'])
  })

  it('marks the failure on the step that broke and leaves the save pending', () => {
    expect(
      getStatuses({
        kind: 'publish',
        step: 'uploading',
        outcome: 'failed'
      })
    ).toStrictEqual(['done', 'done', 'done', 'failed', 'pending'])
  })

  it('marks every step as done once the run succeeded', () => {
    expect(
      getStatuses({
        kind: 'publish',
        step: 'saving',
        outcome: 'succeeded'
      })
    ).toStrictEqual(['done', 'done', 'done', 'done', 'done'])
  })
})

describe('pacePublishRun', () => {
  it('shows the next unrevealed step as active while the real run is ahead', () => {
    expect(
      getStatuses(
        pacePublishRun(
          { kind: 'publish', step: 'uploading', outcome: 'running' },
          1
        )
      )
    ).toStrictEqual(['done', 'active', 'pending', 'pending', 'pending'])
  })

  it('holds a success back until every step has been revealed', () => {
    expect(
      getStatuses(
        pacePublishRun(
          { kind: 'regenerate', step: 'uploading', outcome: 'succeeded' },
          getPublishRunSteps('regenerate').length - 1
        )
      )
    ).toStrictEqual(['done', 'done', 'done', 'active'])
  })

  it('shows the real run once every step has been revealed', () => {
    const run = {
      kind: 'publish',
      step: 'saving',
      outcome: 'succeeded'
    } as const satisfies PublishRun

    expect(pacePublishRun(run, getPublishRunTarget(run))).toBe(run)
  })

  it('reveals a failure on the step that broke', () => {
    const run = {
      kind: 'publish',
      step: 'watermarking',
      outcome: 'failed'
    } as const satisfies PublishRun

    expect(
      getStatuses(pacePublishRun(run, getPublishRunTarget(run)))
    ).toStrictEqual(['done', 'failed', 'pending', 'pending', 'pending'])
  })
})
