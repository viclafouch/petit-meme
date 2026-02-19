/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { z } from 'zod'
import { prismaClient } from '@/db'
import { clientEnv } from '@/env/client'
import {
  algoliaAdminClient,
  algoliaIndexName,
  memeToAlgoliaRecord
} from '@/lib/algolia'
import {
  createVideo,
  deleteVideo,
  getBunnyHeaders,
  uploadVideo
} from '@/lib/bunny'
import {
  extractTweetIdFromUrl,
  getTweetById,
  getTweetMedia
} from '@/lib/react-tweet'
import { stripeClient } from '@/lib/stripe'
import { fetchWithZod } from '@/lib/utils'
import mocks from './seed-mock.json' assert { type: 'json' }

const getListVideos = async () => {
  return fetchWithZod(
    z.object({ items: z.array(z.object({ guid: z.string() })) }),
    `https://video.bunnycdn.com/library/${clientEnv.VITE_BUNNY_LIBRARY_ID}/videos`,
    {
      method: 'GET',
      headers: getBunnyHeaders()
    }
  )
}

const createMemeFromTwitterUrl = async (url: string, title: string) => {
  const tweetId = z.string().parse(extractTweetIdFromUrl(url))

  const tweet = await getTweetById(tweetId)
  const media = await getTweetMedia(tweet.video.url, tweet.poster.url)

  const arrayBuffer = await media.video.blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { videoId } = await createVideo(title)

  const meme = await prismaClient.meme.create({
    data: {
      title,
      tweetUrl: tweet.url,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      video: {
        create: {
          duration: 0,
          bunnyStatus: 4,
          bunnyId: videoId
        }
      }
    },
    include: {
      video: true,
      categories: {
        include: { category: true }
      }
    }
  })

  await algoliaAdminClient
    .saveObject({
      indexName: algoliaIndexName,
      body: memeToAlgoliaRecord(meme)
    })
    .catch((error) => {
      console.error(error)
    })

  await uploadVideo(videoId, buffer)
}

const seed = async () => {
  console.log(
    'Deleting data from tables: meme, category, subscription, video, user...'
  )
  await prismaClient.meme.deleteMany({})
  await prismaClient.video.deleteMany({})
  await prismaClient.subscription.deleteMany({})
  await prismaClient.category.deleteMany({})
  await prismaClient.user.deleteMany({})

  console.log('Deleting all objects from Algolia index...')
  await algoliaAdminClient.replaceAllObjects({
    indexName: algoliaIndexName,
    objects: []
  })

  console.log('Getting all customers from Stripe...')
  const customers = await stripeClient.customers.list()

  console.log(`Deleting ${customers.data.length} customers from Stripe...`)

  for (const customer of customers.data) {
    await stripeClient.customers.del(customer.id)
  }

  console.log('Getting list of videos from Bunny CDN...')
  const listVideos = await getListVideos()

  console.log(`Deleting ${listVideos.items.length} videos from Bunny CDN...`)

  for (const bunnyVideo of listVideos.items) {
    await deleteVideo(bunnyVideo.guid)
  }

  console.log(`Creating ${mocks.categories.length} categories... into database`)

  for (const category of mocks.categories) {
    await prismaClient.category.create({
      data: category
    })
  }

  console.log(`Creating and uploading ${mocks.memes.length} memes...`)

  for (const meme of mocks.memes) {
    await createMemeFromTwitterUrl(meme.tweetUrl, meme.title)
  }
}

void seed()
