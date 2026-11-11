import { describe, expect, it } from 'vitest'
import {
  buildPublishTimeline,
  enterPublishStep,
  getPublishRunSteps,
  getPublishRunTarget,
  pacePublishRun,
  settlePublishRun,
  startPublishRun,
  trackPublishProgress,
  type PublishRun
} from '~/routes/admin/library/-lib/publish-run'

const RUN_ID = 1
const PROGRESS_PERCENT = 42

const getStatuses = (run: PublishRun) => {
  return buildPublishTimeline(run).map(({ status }) => {
    return status
  })
}

describe('getPublishRunSteps', () => {
  it('only saves when the files are already on Bunny', () => {
    expect(getPublishRunSteps('publish')).toStrictEqual(['saving'])
  })

  it('runs the four file steps then the save when a file is missing', () => {
    expect(getPublishRunSteps('publish-with-files')).toStrictEqual([
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

describe('buildPublishTimeline', () => {
  it('marks the steps before the current one as done and the next ones as pending', () => {
    expect(
      getStatuses({
        kind: 'publish-with-files',
        step: 'watermarking',
        outcome: 'running'
      })
    ).toStrictEqual(['done', 'active', 'pending', 'pending', 'pending'])
  })

  it('marks the failure on the step that broke and leaves the save pending', () => {
    expect(
      getStatuses({
        kind: 'publish-with-files',
        step: 'uploading',
        outcome: 'failed'
      })
    ).toStrictEqual(['done', 'done', 'done', 'failed', 'pending'])
  })

  it('marks every step as done once the run succeeded', () => {
    expect(
      getStatuses({
        kind: 'publish-with-files',
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
          { kind: 'publish-with-files', step: 'uploading', outcome: 'running' },
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
      kind: 'publish-with-files',
      step: 'saving',
      outcome: 'succeeded'
    } as const satisfies PublishRun

    expect(pacePublishRun(run, getPublishRunTarget(run))).toBe(run)
  })

  it('reveals a failure on the step that broke', () => {
    const run = {
      kind: 'publish-with-files',
      step: 'watermarking',
      outcome: 'failed'
    } as const satisfies PublishRun

    expect(
      getStatuses(pacePublishRun(run, getPublishRunTarget(run)))
    ).toStrictEqual(['done', 'failed', 'pending', 'pending', 'pending'])
  })
})

describe('the publish run lifecycle', () => {
  it('starts on the first step of its kind', () => {
    expect(startPublishRun('publish-with-files', RUN_ID)).toStrictEqual({
      id: RUN_ID,
      kind: 'publish-with-files',
      step: 'preparing',
      outcome: 'running',
      progress: null,
      error: null
    })
  })

  it('drops the progress of the previous step on a new step', () => {
    const run = trackPublishProgress(
      startPublishRun('regenerate', RUN_ID),
      PROGRESS_PERCENT
    )

    expect(enterPublishStep(run, 'watermarking')).toMatchObject({
      step: 'watermarking',
      progress: null
    })
  })

  it('fails with the reason and succeeds without one', () => {
    const run = startPublishRun('publish', RUN_ID)

    expect(settlePublishRun(run, 'Bunny is down')).toMatchObject({
      outcome: 'failed',
      error: 'Bunny is down'
    })
    expect(settlePublishRun(run, null)).toMatchObject({
      outcome: 'succeeded',
      error: null
    })
  })
})
