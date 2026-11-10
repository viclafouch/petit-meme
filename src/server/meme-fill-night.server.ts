import {
  MEME_FILL_MAX_DURATION_MS,
  READY_MEME_DRAFT_WHERE
} from '~/constants/meme-fill'
import { prismaClient } from '~/db/client.server'
import { CONTACT_EMAIL } from '~/emails/constants'
import { MemeFillDigestEmail } from '~/emails/meme-fill-digest-email'
import { truncateToUtcDay } from '~/helpers/date'
import { formatMemeFillDigestSummary } from '~/helpers/meme-fill-digest'
import {
  findUnfilledMemeDrafts,
  type MemeFillFailure,
  retryUnfilledMemeDraft,
  type UnfilledMemeDraft
} from '~/lib/meme-draft-fill.server'
import { sendEmail } from '~/lib/resend.server'

const DIGEST_RESERVE_MS = 60_000
const MIN_RETRY_MS = 180_000

export type MemeFillDigest = {
  readyDrafts: { id: string; title: string; doubt: string }[]
  failures: MemeFillFailure[]
}

type RetryQueueParams = {
  queue: UnfilledMemeDraft[]
  deadline: number
  failures: MemeFillFailure[]
}

async function retryQueue({
  queue,
  deadline,
  failures
}: RetryQueueParams): Promise<MemeFillFailure[]> {
  const [draft, ...rest] = queue
  const remainingMs = deadline - Date.now()

  if (!draft || remainingMs < MIN_RETRY_MS) {
    return failures
  }

  const failure = await retryUnfilledMemeDraft({
    draft,
    timeoutMs: remainingMs
  })

  return retryQueue({
    queue: rest,
    deadline,
    failures: failure ? [...failures, failure] : failures
  })
}

async function findReadyDrafts() {
  const memes = await prismaClient.meme.findMany({
    where: READY_MEME_DRAFT_WHERE,
    select: { id: true, title: true, fillDoubt: true },
    orderBy: { updatedAt: 'asc' }
  })

  return memes.map(({ id, title, fillDoubt }) => {
    return { id, title, doubt: fillDoubt }
  })
}

export async function runMemeFillNight(startedAt: Date) {
  const queue = await findUnfilledMemeDrafts(startedAt)
  const failures = await retryQueue({
    queue,
    deadline:
      startedAt.getTime() + MEME_FILL_MAX_DURATION_MS - DIGEST_RESERVE_MS,
    failures: []
  })
  const digest: MemeFillDigest = {
    readyDrafts: await findReadyDrafts(),
    failures
  }

  if (digest.readyDrafts.length === 0 && digest.failures.length === 0) {
    return { isSent: false, digest }
  }

  const isSent = await sendEmail({
    to: CONTACT_EMAIL,
    subject: `Petit Meme : ${formatMemeFillDigestSummary(digest)}`,
    react: MemeFillDigestEmail({ digest }),
    idempotencyKey: `meme-fill-digest/${truncateToUtcDay(startedAt).toISOString()}`
  })

  return { isSent, digest }
}
