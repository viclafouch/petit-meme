import { DAY, DAYS_PER_WEEK, SECOND, THIRTY_DAYS_MS } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import type {
  MemeExportFormat,
  MemeProposalStatus
} from '~/db/generated/prisma/enums'
import { truncateToUtcDay } from '~/helpers/date'
import type { SeededPerson } from './people'
import {
  randomChance,
  randomDateBetween,
  randomHex,
  randomInteger,
  randomPick,
  randomSample
} from './random'

const WINDOW_DAYS = THIRTY_DAYS_MS / DAY
const WINDOW_SHARE_OF_LIFETIME = 0.3
const DAILY_SPREAD_MIN = 0.4
const DAILY_SPREAD_RANGE = 1.2
const HOT_MEME_COUNT = 8
const HOT_MULTIPLIER = 3
const SIGNED_IN_SHARE = 0.12
const PREMIUM_SOUND_SHARE = 0.3
const MIN_WATCH_MS = 1500
const VIEWER_KEY_BYTES = 32
const LAST_IP_OCTET = 254
const INSERT_CHUNK_SIZE = 1000
const MAX_BOOKMARKS_PER_PERSON = 8
const STUDIO_USER_SHARE = 0.4
const MAX_GENERATIONS_PER_PERSON = 4
const AI_SEARCH_USER_SHARE = 0.3
const MAX_AI_SEARCHES_PER_PERSON = 3
const MAX_AI_SEARCH_RESULTS = 6

const COUNTRIES = ['FR', 'FR', 'FR', 'FR', 'FR', 'BE', 'CH', 'CA', 'US', 'GB']

const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15'
]

const DOCUMENTATION_IP_PREFIXES = ['192.0.2', '198.51.100', '203.0.113']

const AI_SEARCH_PROMPTS = [
  { prompt: 'quelqu’un qui pleure de rire', keywords: ['rire', 'pleurer'] },
  { prompt: 'un mec énervé au travail', keywords: ['énervé', 'travail'] },
  { prompt: 'réaction gênante à la télé', keywords: ['gênant', 'télé'] },
  { prompt: 'someone saying no', keywords: ['no', 'refuse'] },
  { prompt: 'un politicien qui dit non', keywords: ['politique', 'non'] },
  { prompt: 'célébrer une victoire', keywords: ['célébrer', 'victoire'] }
]

const PROPOSAL_STATUSES = [
  'APPROVED',
  'APPROVED',
  'REJECTED',
  'PENDING'
] as const satisfies readonly MemeProposalStatus[]

const EXPORT_ACTIONS = [
  { action: 'download', type: 'DOWNLOAD', counter: 'downloadCount' },
  { action: 'share', type: 'SHARE', counter: 'shareCount' }
] as const

const ACTIVITY_MEME_SELECT = {
  id: true,
  title: true,
  tweetUrl: true,
  viewCount: true,
  downloadCount: true,
  shareCount: true,
  publishedAt: true,
  video: { select: { duration: true } }
} as const satisfies Prisma.MemeSelect

type ActivityMeme = Prisma.MemeGetPayload<{
  select: typeof ACTIVITY_MEME_SELECT
}>

type WindowDay = {
  day: Date
  isHot: boolean
}

type Traffic = {
  views: Prisma.MemeViewDailyCreateManyInput[]
  actions: Prisma.MemeActionDailyCreateManyInput[]
  events: Prisma.ActivityEventCreateManyInput[]
}

type TrafficContext = {
  traffic: Traffic
  visitors: SeededPerson[]
  premiumIds: Set<string>
}

type MemeDay = {
  meme: ActivityMeme
  day: Date
  boost: number
}

const insertInChunks = async <TRow>(
  rows: TRow[],
  insert: (chunk: TRow[]) => Promise<Prisma.BatchPayload>
) => {
  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    // oxlint-disable-next-line no-await-in-loop -- chunks land one after the other
    await insert(rows.slice(start, start + INSERT_CHUNK_SIZE))
  }
}

const buildDailyCount = (lifetime: number, boost: number) => {
  const perDay = (lifetime * WINDOW_SHARE_OF_LIFETIME * boost) / WINDOW_DAYS

  return Math.round(
    perDay * (DAILY_SPREAD_MIN + Math.random() * DAILY_SPREAD_RANGE)
  )
}

const listWindowDays = (): WindowDay[] => {
  const today = truncateToUtcDay(new Date()).getTime()

  return Array.from({ length: WINDOW_DAYS }, (_, index) => {
    return { day: new Date(today - index * DAY), isHot: index < DAYS_PER_WEEK }
  })
}

const buildVisit = (day: Date, visitors: SeededPerson[]) => {
  const visitor = randomChance(SIGNED_IN_SHARE)
    ? randomPick(visitors)
    : undefined

  return {
    createdAt: new Date(
      Math.min(Date.now(), day.getTime() + randomInteger(0, DAY - SECOND))
    ),
    ipAddress: `${randomPick(DOCUMENTATION_IP_PREFIXES)}.${randomInteger(1, LAST_IP_OCTET)}`,
    country: randomPick(COUNTRIES),
    userAgent: randomPick(USER_AGENTS),
    userId: visitor?.id
  }
}

const addViews = (
  { traffic, visitors }: TrafficContext,
  { meme, day, boost }: MemeDay
) => {
  const maxWatchMs = Math.max(MIN_WATCH_MS, meme.video.duration * SECOND * 2)
  const viewTotal = buildDailyCount(meme.viewCount, boost)

  for (let index = 0; index < viewTotal; index += 1) {
    const viewerKey = randomHex(VIEWER_KEY_BYTES)

    traffic.views.push({
      memeId: meme.id,
      viewerKey,
      day,
      watchMs: randomInteger(MIN_WATCH_MS, maxWatchMs)
    })
    traffic.events.push({
      type: 'VIEW',
      memeId: meme.id,
      dedupKey: `${meme.id}:${viewerKey}`,
      ...buildVisit(day, visitors)
    })
  }
}

const addExports = (
  { traffic, visitors, premiumIds }: TrafficContext,
  { meme, day, boost }: MemeDay
) => {
  for (const { action, type, counter } of EXPORT_ACTIONS) {
    const count = buildDailyCount(meme[counter], boost)

    if (count > 0) {
      traffic.actions.push({ memeId: meme.id, day, action, count })
    }

    for (let index = 0; index < count; index += 1) {
      const visit = buildVisit(day, visitors)
      const isSound =
        visit.userId !== undefined &&
        premiumIds.has(visit.userId) &&
        randomChance(PREMIUM_SOUND_SHARE)
      const format: MemeExportFormat = isSound ? 'mp3' : 'mp4'

      traffic.events.push({ type, memeId: meme.id, format, ...visit })
    }
  }
}

const buildTraffic = (people: SeededPerson[], memes: ActivityMeme[]) => {
  const context: TrafficContext = {
    traffic: { views: [], actions: [], events: [] },
    visitors: people.filter(({ isAdmin }) => {
      return !isAdmin
    }),
    premiumIds: new Set(
      people
        .filter(({ isPremium, isAdmin }) => {
          return isPremium && !isAdmin
        })
        .map(({ id }) => {
          return id
        })
    )
  }
  const hotIds = new Set(
    randomSample(memes, HOT_MEME_COUNT).map(({ id }) => {
      return id
    })
  )

  for (const meme of memes) {
    const publishedDay = truncateToUtcDay(meme.publishedAt ?? new Date(0))
    const activeDays = listWindowDays().filter(({ day }) => {
      return day >= publishedDay
    })

    for (const { day, isHot } of activeDays) {
      const boost = isHot && hotIds.has(meme.id) ? HOT_MULTIPLIER : 1
      const memeDay = { meme, day, boost }
      addViews(context, memeDay)
      addExports(context, memeDay)
    }
  }

  return context.traffic
}

type PersonActivity = {
  events: Prisma.ActivityEventCreateManyInput[]
  bookmarks: Prisma.BookmarkCreateManyInput[]
  generations: Prisma.StudioGenerationCreateManyInput[]
  aiSearches: Prisma.AiSearchLogCreateManyInput[]
}

const addPersonActivity = (
  activity: PersonActivity,
  person: SeededPerson,
  memes: ActivityMeme[]
) => {
  const now = new Date()
  const userId = person.id

  for (const meme of randomSample(
    memes,
    randomInteger(0, MAX_BOOKMARKS_PER_PERSON)
  )) {
    const createdAt = randomDateBetween(person.createdAt, now)
    activity.bookmarks.push({ userId, memeId: meme.id, createdAt })
    activity.events.push({
      type: 'BOOKMARK_ADDED',
      userId,
      memeId: meme.id,
      createdAt
    })
  }

  const generationCount = randomChance(STUDIO_USER_SHARE)
    ? randomInteger(1, MAX_GENERATIONS_PER_PERSON)
    : 0

  for (let index = 0; index < generationCount; index += 1) {
    const memeId = randomPick(memes).id
    const createdAt = randomDateBetween(person.createdAt, now)
    activity.generations.push({ userId, memeId, createdAt })
    activity.events.push({ type: 'GENERATION', userId, memeId, createdAt })
  }

  const searchCount = randomChance(AI_SEARCH_USER_SHARE)
    ? randomInteger(1, MAX_AI_SEARCHES_PER_PERSON)
    : 0

  for (let index = 0; index < searchCount; index += 1) {
    const { prompt, keywords } = randomPick(AI_SEARCH_PROMPTS)
    const memeIds = randomSample(
      memes,
      randomInteger(0, MAX_AI_SEARCH_RESULTS)
    ).map(({ id }) => {
      return id
    })
    const createdAt = randomDateBetween(person.createdAt, now)
    activity.aiSearches.push({
      userId,
      prompt,
      keywords,
      memeIds,
      locale: person.locale,
      resultCount: memeIds.length,
      createdAt
    })
    activity.events.push({ type: 'AI_SEARCH', userId, createdAt })
  }
}

const buildPeopleActivity = async (
  people: SeededPerson[],
  memes: ActivityMeme[]
) => {
  const activity: PersonActivity = {
    events: [],
    bookmarks: [],
    generations: [],
    aiSearches: []
  }

  for (const person of people) {
    activity.events.push({
      type: 'SIGNUP',
      userId: person.id,
      createdAt: person.createdAt
    })

    if (!person.isAdmin) {
      addPersonActivity(activity, person, memes)
    }
  }

  const subscriptions = await prismaClient.subscription.findMany({
    select: {
      referenceId: true,
      plan: true,
      billingInterval: true,
      periodStart: true
    }
  })

  for (const {
    referenceId,
    plan,
    billingInterval,
    periodStart
  } of subscriptions) {
    activity.events.push({
      type: 'SUBSCRIPTION',
      userId: referenceId,
      metadata: { plan, billingInterval },
      createdAt: periodStart ?? new Date()
    })
  }

  return activity
}

const createProposals = async (
  people: SeededPerson[],
  memes: ActivityMeme[]
) => {
  const proposers = people.filter(({ isAdmin }) => {
    return !isAdmin
  })
  const tweetedMemes = memes.filter(({ tweetUrl }) => {
    return tweetUrl !== null
  })

  for (const [index, status] of PROPOSAL_STATUSES.entries()) {
    const meme = tweetedMemes[index]

    if (!meme?.tweetUrl) {
      continue
    }

    // oxlint-disable-next-line no-await-in-loop -- proposals land one after the other
    await prismaClient.memeProposal.create({
      data: {
        userId: randomPick(proposers).id,
        title: meme.title,
        url: meme.tweetUrl,
        urlType: 'TWEET',
        contentLocale: 'FR',
        status,
        memeId: status === 'APPROVED' ? meme.id : null
      }
    })
  }
}

const recordArchivesInAuditLog = async (adminId: string) => {
  const archivedMemes = await prismaClient.meme.findMany({
    where: { status: 'ARCHIVED' },
    select: { id: true, title: true }
  })

  await prismaClient.adminAuditLog.createMany({
    data: archivedMemes.map(({ id, title }) => {
      return {
        action: 'status_change',
        actingAdminId: adminId,
        targetId: id,
        targetType: 'meme',
        metadata: { title, from: 'PUBLISHED', to: 'ARCHIVED' }
      }
    })
  })
}

export const createActivity = async (people: SeededPerson[]) => {
  const memes = await prismaClient.meme.findMany({
    where: { status: 'PUBLISHED' },
    select: ACTIVITY_MEME_SELECT
  })
  const traffic = buildTraffic(people, memes)
  const activity = await buildPeopleActivity(people, memes)
  const events = [...traffic.events, ...activity.events]

  await insertInChunks(traffic.views, (data) => {
    return prismaClient.memeViewDaily.createMany({ data })
  })
  await insertInChunks(traffic.actions, (data) => {
    return prismaClient.memeActionDaily.createMany({ data })
  })
  await insertInChunks(events, (data) => {
    return prismaClient.activityEvent.createMany({ data })
  })
  await prismaClient.bookmark.createMany({ data: activity.bookmarks })
  await prismaClient.studioGeneration.createMany({
    data: activity.generations
  })
  await prismaClient.aiSearchLog.createMany({ data: activity.aiSearches })

  for (const person of people) {
    // oxlint-disable-next-line no-await-in-loop -- updates land one after the other
    await prismaClient.user.update({
      where: { id: person.id },
      data: {
        generationCount: activity.generations.filter(({ userId }) => {
          return userId === person.id
        }).length
      }
    })
  }

  await createProposals(people, memes)

  const admin = people.find(({ isAdmin }) => {
    return isAdmin
  })

  if (admin) {
    await recordArchivesInAuditLog(admin.id)
  }

  return { views: traffic.views.length, events: events.length }
}
