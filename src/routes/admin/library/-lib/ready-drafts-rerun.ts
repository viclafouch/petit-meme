import { MemeFillStatus } from '~/db/generated/prisma/enums'
import { matchIsFillInFlight } from '~/helpers/meme-fill'

export type RerunStart =
  | { status: 'queued' }
  | { status: 'starting' }
  | { status: 'started'; startedAt: number }
  | { status: 'refused'; reason: string }

type RerunFill = {
  fillStatus: MemeFillStatus
  hasSuggestion: boolean
  isStalled: boolean
}

export type RerunDraftStep =
  | 'queued'
  | 'starting'
  | 'running'
  | 'rewritten'
  | 'proposed'
  | 'failed'

type ResolveRerunDraftStepParams = {
  start: RerunStart
  fill: RerunFill | undefined
  fetchedAt: number
}

export const resolveRerunDraftStep = ({
  start,
  fill,
  fetchedAt
}: ResolveRerunDraftStepParams): RerunDraftStep => {
  if (start.status === 'queued' || start.status === 'starting') {
    return start.status
  }

  if (start.status === 'refused') {
    return 'failed'
  }

  if (fetchedAt < start.startedAt) {
    return 'running'
  }

  if (!fill) {
    return 'failed'
  }

  if (fill.isStalled || fill.fillStatus === MemeFillStatus.FAILED) {
    return 'failed'
  }

  if (matchIsFillInFlight(fill.fillStatus)) {
    return 'running'
  }

  if (fill.fillStatus !== MemeFillStatus.FILLED) {
    return 'failed'
  }

  return fill.hasSuggestion ? 'proposed' : 'rewritten'
}

export const matchIsRerunStepSettled = (step: RerunDraftStep) => {
  return step === 'rewritten' || step === 'proposed' || step === 'failed'
}
