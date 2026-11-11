import { describe, expect, it } from 'vitest'
import { clientEnvSchema } from '~/env/client-schema'

const matchIsAcceptedBunnyHostname = (value: string) => {
  return clientEnvSchema.VITE_BUNNY_HOSTNAME.safeParse(value).success
}

describe('clientEnvSchema.VITE_BUNNY_HOSTNAME', () => {
  it('should accept a hostname under petit-meme.io', () => {
    expect(matchIsAcceptedBunnyHostname('cdn.petit-meme.io')).toBe(true)
  })

  it('should refuse the b-cdn.net hostname of a pull zone', () => {
    expect(matchIsAcceptedBunnyHostname('vz-56eb02b0-283.b-cdn.net')).toBe(
      false
    )
  })

  it('should refuse a hostname that only contains petit-meme.io', () => {
    expect(matchIsAcceptedBunnyHostname('cdn.petit-meme.io.evil.com')).toBe(
      false
    )
  })

  it('should refuse a URL in place of a hostname', () => {
    expect(matchIsAcceptedBunnyHostname('https://cdn.petit-meme.io')).toBe(
      false
    )
  })
})
