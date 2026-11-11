import type { Thing } from 'schema-dts'
import { describe, expect, it } from 'vitest'
import type { MemeWithVideo } from '~/constants/meme'

const BUNNY_ID = 'video-guid'
const CRAWLER_STREAM_URL = `https://cdn-test.petit-meme.io/bcdn_token=HS256-token&token_path=%2F${BUNNY_ID}%2F&expires=4102444800/${BUNNY_ID}/playlist.m3u8`
const EMBED_URL = 'https://www.petit-meme.io/embed/meme-id'

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
  video: { id: 1, bunnyId: BUNNY_ID, duration: 12, bunnyStatus: 3 }
} as const satisfies MemeWithVideo

const findVideoObject = (graph: readonly Thing[]) => {
  return graph.find((node) => {
    return (
      typeof node === 'object' &&
      '@type' in node &&
      node['@type'] === 'VideoObject'
    )
  })
}

const importSeo = () => {
  return import('~/lib/seo')
}

describe('video structured data', () => {
  it('should give a Visitor the player only, without a video file URL', async () => {
    const { buildMemeJsonLd } = await importSeo()

    const videoObject = findVideoObject(buildMemeJsonLd(MEME, null)['@graph'])

    expect(videoObject).toMatchObject({ embedUrl: EMBED_URL })
    expect(videoObject).not.toHaveProperty('contentUrl')
  })

  it('should give a verified crawler the signed HLS stream', async () => {
    const { buildMemeJsonLd } = await importSeo()

    const videoObject = findVideoObject(
      buildMemeJsonLd(MEME, CRAWLER_STREAM_URL)['@graph']
    )

    expect(videoObject).toMatchObject({
      embedUrl: EMBED_URL,
      contentUrl: CRAWLER_STREAM_URL,
      encodingFormat: 'application/vnd.apple.mpegurl'
    })
  })

  it('should list category Memes without a video file URL', async () => {
    const { buildCategoryJsonLd } = await importSeo()

    const graph = buildCategoryJsonLd(undefined, { page: 1, memes: [MEME] })

    expect(JSON.stringify(graph)).not.toContain('contentUrl')
    expect(JSON.stringify(graph)).toContain(EMBED_URL)
  })
})
