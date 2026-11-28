import { describe, expect, it } from 'vitest'
import type { MemeWithVideo } from '~/constants/meme'

const BUNNY_ID = 'video-guid'
const CRAWLER_STREAM_URL = `https://cdn-test.petit-meme.io/bcdn_token=HS256-token&token_path=%2F${BUNNY_ID}%2F&expires=4102444800/${BUNNY_ID}/playlist.m3u8`
const EMBED_URL = 'https://www.petit-meme.io/embed/meme-id'
const RAW_THUMBNAIL_URL = `https://cdn-test.petit-meme.io/${BUNNY_ID}/thumbnail.jpg`
const THUMBNAIL_URLS = [
  RAW_THUMBNAIL_URL,
  'https://www.petit-meme.io/api/og?type=thumbnail&id=meme-id&ratio=1x1',
  'https://www.petit-meme.io/api/og?type=thumbnail&id=meme-id&ratio=4x3',
  'https://www.petit-meme.io/api/og?type=thumbnail&id=meme-id&ratio=16x9'
]

const MEME = {
  id: 'meme-id',
  title: 'Meme title',
  videoId: 1,
  viewCount: 10,
  shareCount: 0,
  downloadCount: 0,
  tweetUrl: null,
  description: 'Meme description',
  keywords: ['keyword'],
  contentLocale: 'FR',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  publishedAt: new Date('2026-01-02T00:00:00Z'),
  status: 'PUBLISHED',
  video: {
    id: 1,
    bunnyId: BUNNY_ID,
    duration: 12,
    width: null,
    height: null,
    bunnyStatus: 3
  }
} as const satisfies MemeWithVideo

const importMemeJsonLd = () => {
  return import('~/routes/_public__root/memes/-lib/meme-json-ld')
}

describe('video structured data', () => {
  it('should give a Visitor the player only, without a video file URL', async () => {
    const { buildVideoNode } = await importMemeJsonLd()

    const videoObject = buildVideoNode(MEME, null)

    expect(videoObject).toMatchObject({ embedUrl: EMBED_URL })
    expect(videoObject).not.toHaveProperty('contentUrl')
  })

  it('should give a verified crawler the signed HLS stream', async () => {
    const { buildVideoNode } = await importMemeJsonLd()

    expect(buildVideoNode(MEME, CRAWLER_STREAM_URL)).toMatchObject({
      embedUrl: EMBED_URL,
      contentUrl: CRAWLER_STREAM_URL,
      encodingFormat: 'application/vnd.apple.mpegurl'
    })
  })

  it('should offer Google the raw thumbnail first, then a filled one per aspect ratio', async () => {
    const { buildVideoNode } = await importMemeJsonLd()

    expect(buildVideoNode(MEME, null)).toMatchObject({
      thumbnailUrl: THUMBNAIL_URLS
    })
  })

  it('should date the video from its publication', async () => {
    const { buildVideoNode } = await importMemeJsonLd()

    expect(buildVideoNode(MEME, null)).toMatchObject({
      uploadDate: '2026-01-02T00:00:00.000Z'
    })
  })
})
