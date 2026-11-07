import { describe, expect, it } from 'vitest'
import { buildUrlEntry } from '~/lib/sitemap.server'

const PLAYER_URL = 'https://www.petit-meme.io/embed/meme-id'

describe('buildUrlEntry', () => {
  it('should point the video at the player, never at a video file', () => {
    const entry = buildUrlEntry({
      loc: 'https://www.petit-meme.io/memes/meme-id',
      video: {
        thumbnailLoc: 'https://vz-test.b-cdn.net/video-guid/thumbnail.jpg',
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
