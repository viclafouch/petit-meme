import { describe, expect, it } from 'vitest'
import { getSharedLink } from '~/helpers/share-target'

describe('getSharedLink', () => {
  it('should keep the shared url when the app sends one', () => {
    expect(getSharedLink({ url: 'https://x.com/user/status/1234567890' })).toBe(
      'https://x.com/user/status/1234567890'
    )
  })

  it('should find the link inside the shared text when the url is missing', () => {
    expect(
      getSharedLink({
        text: 'Regarde ça https://x.com/user/status/1234567890?s=20 trop drôle'
      })
    ).toBe('https://x.com/user/status/1234567890?s=20')
  })

  it('should prefer the url over a link written in the text', () => {
    expect(
      getSharedLink({
        url: 'https://youtu.be/dQw4w9WgXcQ',
        text: 'https://x.com/user/status/1234567890'
      })
    ).toBe('https://youtu.be/dQw4w9WgXcQ')
  })

  it('should return nothing when no link was shared', () => {
    expect(getSharedLink({ text: 'juste du texte' })).toBeUndefined()
    expect(getSharedLink({})).toBeUndefined()
  })

  it('should ignore a url that is not a web link', () => {
    expect(getSharedLink({ url: 'ftp://example.com/meme.mp4' })).toBeUndefined()
  })
})
