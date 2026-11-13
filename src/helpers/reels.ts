import {
  MAX_REELS_SEED,
  REELS_CURSOR_SCHEMA,
  REELS_PAGE_SIZE,
  type ReelsCursor
} from '~/constants/reels'

const REELS_POSITION_COOKIE_REGEX = /^(?<seed>\d+)\.(?<offset>\d+)$/u

export const toReelsPositionCookie = ({
  seed,
  offset
}: NonNullable<ReelsCursor>) => {
  return `${seed}.${offset}`
}

export const parseReelsPositionCookie = (cookie: string | undefined) => {
  const { seed, offset } =
    REELS_POSITION_COOKIE_REGEX.exec(cookie ?? '')?.groups ?? {}

  return (
    REELS_CURSOR_SCHEMA.safeParse({
      seed: Number(seed),
      offset: Number(offset)
    }).data ?? null
  )
}

const toNextSeed = (seed: number) => {
  return (seed + 1) % (MAX_REELS_SEED + 1)
}

export const toNextReelsCursor = (
  { seed, offset }: NonNullable<ReelsCursor>,
  pageLength: number
): ReelsCursor => {
  if (pageLength === REELS_PAGE_SIZE) {
    return { seed, offset: offset + REELS_PAGE_SIZE }
  }

  if (pageLength === 0 && offset === 0) {
    return null
  }

  return { seed: toNextSeed(seed), offset: 0 }
}
