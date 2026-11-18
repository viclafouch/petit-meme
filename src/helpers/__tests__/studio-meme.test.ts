import { describe, expect, it } from 'vitest'
import { toStudioMeme } from '~/helpers/studio-meme'

const MEME = {
  id: 'meme-id',
  title: 'Le chat qui veut un cookie',
  video: { bunnyId: 'bunny-id', width: 1080, height: 1920 }
}

describe('toStudioMeme', () => {
  it('should carry the Meme and the size of its Video', () => {
    expect(toStudioMeme(MEME)).toStrictEqual({
      id: 'meme-id',
      title: 'Le chat qui veut un cookie',
      bunnyId: 'bunny-id',
      width: 1080,
      height: 1920
    })
  })

  it('should fall back to a landscape size when the Video has none yet', () => {
    expect(
      toStudioMeme({
        ...MEME,
        video: { ...MEME.video, width: null, height: null }
      })
    ).toMatchObject({ width: 1280, height: 720 })
  })
})
