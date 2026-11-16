import { randomBytes } from 'node:crypto'
import { setTimeout as wait } from 'node:timers/promises'
import type { MemeStatus } from '~/db/generated/prisma/enums'
import { logEnvironmentInfo } from '../scripts/lib/env-guard'
import { backfillVideoDimensions } from '../scripts/lib/video-dimensions'
import seedMemes from './seed-memes.json' with { type: 'json' }
import { createActivity } from './seed/activity'
import {
  copyCategories,
  copyMemes,
  indexPublishedMemes,
  waitForEncodedVideos
} from './seed/library'
import { createPeople, SEED_LOGIN_HINT } from './seed/people'
import {
  assertSeedTargetIsNotProduction,
  loadProductionSource,
  readProductionLibrary
} from './seed/production-source'
import { resetTarget } from './seed/reset'

const ABORT_GRACE_PERIOD_MS = 5000
const GENERATED_PASSWORD_BYTES = 12

const resolveSeedPassword = () => {
  // oxlint-disable-next-line node/no-process-env -- the seed password stays out of every env file and of Git
  const { SEED_PASSWORD } = process.env

  return (
    SEED_PASSWORD ?? randomBytes(GENERATED_PASSWORD_BYTES).toString('base64url')
  )
}

const buildStatusById = () => {
  return new Map<string, MemeStatus>([
    ...seedMemes.pending.map((id) => {
      return [id, 'PENDING'] as const
    }),
    ...seedMemes.archived.map((id) => {
      return [id, 'ARCHIVED'] as const
    })
  ])
}

const seed = async () => {
  logEnvironmentInfo()
  const source = loadProductionSource()
  assertSeedTargetIsNotProduction(source)
  await wait(ABORT_GRACE_PERIOD_MS)

  const memeIds = [
    ...seedMemes.published,
    ...seedMemes.pending,
    ...seedMemes.archived
  ]
  console.log('Reading production, read only...')
  const { categories, memes } = await readProductionLibrary(source, memeIds)

  if (memes.length !== memeIds.length) {
    throw new Error(
      `${memeIds.length - memes.length} seed Memes are no longer published in production: update prisma/seed-memes.json`
    )
  }

  console.log('Resetting the target...')
  await resetTarget()

  console.log(`Copying ${categories.length} categories...`)
  await copyCategories(categories)

  console.log(`Copying ${memes.length} Memes with their original video...`)
  await copyMemes({ source, memes, statusById: buildStatusById() })

  const password = resolveSeedPassword()
  console.log('Creating people...')
  const people = await createPeople(password)
  console.log(`  Password: ${password}`)
  console.log(`  Accounts: ${SEED_LOGIN_HINT}`)

  console.log('Synthesizing activity...')
  const { views, events } = await createActivity(people)
  console.log(`  ${views} views, ${events} activity events`)

  console.log('Waiting for Bunny to encode every video...')
  await waitForEncodedVideos()

  console.log('Storing the dimensions of every video...')
  await backfillVideoDimensions(false)

  console.log('Indexing published Memes...')
  await indexPublishedMemes()

  console.log('\nSeed complete')
  process.exit(0)
}

try {
  await seed()
} catch (error) {
  console.error('Seed failed:', error)
  process.exit(1)
}
