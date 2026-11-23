import { describe, expect, it } from 'vitest'
import {
  buildLocalizedEntries,
  buildSitemapResponse,
  buildUrlEntry
} from '~/server/seo/sitemap.server'

const PLAYER_URL = 'https://www.petit-meme.io/embed/meme-id'

describe('buildUrlEntry', () => {
  it('should point the video at the player, never at a video file', () => {
    const entry = buildUrlEntry({
      loc: 'https://www.petit-meme.io/memes/meme-id',
      video: {
        thumbnailLoc: 'https://cdn-test.petit-meme.io/video-guid/thumbnail.jpg',
        title: 'Meme title',
        description: 'Meme description',
        playerLoc: PLAYER_URL,
        duration: 12
      }
    })

    expect(entry).toContain(
      `<video:player_loc>${PLAYER_URL}</video:player_loc>`
    )
    expect(entry).not.toContain('<video:content_loc>')
  })
})

describe('buildSitemapResponse', () => {
  it('should let the CDN keep the sitemap for its max age', () => {
    const response = buildSitemapResponse({ body: '<urlset />', maxAge: 3600 })

    expect(response.headers.get('Content-Type')).toBe('application/xml')
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
      'max-age=3600'
    )
  })
})

describe('buildLocalizedEntries', () => {
  it('should list a page in every language by default', () => {
    const entries = buildLocalizedEntries([{ pathname: '/memes/category/all' }])

    expect(entries).toContain(
      '<loc>https://www.petit-meme.io/memes/category/all</loc>'
    )
    expect(entries).toContain(
      '<loc>https://www.petit-meme.io/en/memes/category/all</loc>'
    )
  })

  it('should leave out the languages a page is missing in, with their alternates', () => {
    const entries = buildLocalizedEntries([
      { pathname: '/memes/category/chats', locales: ['en'] }
    ])

    expect(entries).toContain(
      '<loc>https://www.petit-meme.io/en/memes/category/chats</loc>'
    )
    expect(entries).not.toContain(
      'https://www.petit-meme.io/memes/category/chats"'
    )
    expect(entries).not.toContain('x-default')
  })
})
