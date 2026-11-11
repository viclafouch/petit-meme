export type PublishRunKind = 'publish' | 'publish-with-files' | 'regenerate'

export type PublishStep =
  | 'preparing'
  | 'watermarking'
  | 'extracting-mp3'
  | 'uploading'
  | 'saving'

const FILE_STEPS = [
  'preparing',
  'watermarking',
  'extracting-mp3',
  'uploading'
] as const satisfies readonly PublishStep[]

const PUBLISH_RUN_STEPS = {
  publish: ['saving'],
  'publish-with-files': [...FILE_STEPS, 'saving'],
  regenerate: FILE_STEPS
} as const satisfies Record<PublishRunKind, readonly PublishStep[]>

export const getPublishRunSteps = (kind: PublishRunKind) => {
  return PUBLISH_RUN_STEPS[kind]
}

type PublishRunOutcome = 'running' | 'succeeded' | 'failed'

export type PublishRun = {
  kind: PublishRunKind
  step: PublishStep
  outcome: PublishRunOutcome
}

export type MemePublishRun = PublishRun & {
  id: number
  progress: number | null
  error: string | null
}

export type PublishStepStatus = 'pending' | 'active' | 'done' | 'failed'

const getPublishStepStatus = (
  run: PublishRun,
  step: PublishStep
): PublishStepStatus => {
  const steps: readonly PublishStep[] = getPublishRunSteps(run.kind)
  const stepIndex = steps.indexOf(step)
  const currentIndex = steps.indexOf(run.step)

  if (stepIndex < currentIndex) {
    return 'done'
  }

  if (stepIndex > currentIndex) {
    return 'pending'
  }

  if (run.outcome === 'failed') {
    return 'failed'
  }

  return run.outcome === 'succeeded' ? 'done' : 'active'
}

export const getPublishRunTarget = (run: PublishRun) => {
  const steps: readonly PublishStep[] = getPublishRunSteps(run.kind)

  return run.outcome === 'succeeded' ? steps.length : steps.indexOf(run.step)
}

export const pacePublishRun = <TRun extends PublishRun>(
  run: TRun,
  revealedCount: number
): TRun => {
  if (revealedCount >= getPublishRunTarget(run)) {
    return run
  }

  return {
    ...run,
    step: getPublishRunSteps(run.kind)[revealedCount],
    outcome: 'running'
  }
}

export const startPublishRun = (
  kind: PublishRunKind,
  id: number
): MemePublishRun => {
  const [firstStep] = getPublishRunSteps(kind)

  return {
    id,
    kind,
    step: firstStep,
    outcome: 'running',
    progress: null,
    error: null
  }
}

export const enterPublishStep = (
  run: MemePublishRun,
  step: PublishStep
): MemePublishRun => {
  return { ...run, step, progress: null }
}

export const trackPublishProgress = (
  run: MemePublishRun,
  progress: number
): MemePublishRun => {
  return { ...run, progress }
}

export const settlePublishRun = (
  run: MemePublishRun,
  error: string | null
): MemePublishRun => {
  return {
    ...run,
    outcome: error === null ? 'succeeded' : 'failed',
    progress: null,
    error
  }
}

export const buildPublishTimeline = (run: PublishRun) => {
  return getPublishRunSteps(run.kind).map((step) => {
    return { step, status: getPublishStepStatus(run, step) }
  })
}
