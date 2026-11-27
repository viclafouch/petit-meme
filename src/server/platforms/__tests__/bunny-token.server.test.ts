import { describe, expect, it } from 'vitest'
import { PLAYBACK_TOKEN_TTL_SECONDS } from '~/constants/bunny'
import { ONE_HOUR_IN_SECONDS } from '~/constants/time'
import {
  signBunnyUrl,
  toSharedExpiresAt
} from '~/server/platforms/bunny-token.server'

const SECURITY_KEY = 'SecurityKey'
const EXPIRES_AT = 1598024587

describe('signBunnyUrl', () => {
  it('should sign a single file with the Bunny advanced token', async () => {
    const signedUrl = await signBunnyUrl({
      url: 'https://token-tester.b-cdn.net/300kb.jpg',
      securityKey: SECURITY_KEY,
      expiresAt: EXPIRES_AT
    })

    expect(signedUrl).toBe(
      'https://token-tester.b-cdn.net/300kb.jpg?token=HS256-o10JRWlsAItyAsdKS6jJKjabHN4FrFsplDHPV1idcX4&expires=1598024587'
    )
  })

  it('should sign a directory in the path so HLS segments inherit the token', async () => {
    const signedUrl = await signBunnyUrl({
      url: 'https://token-tester.b-cdn.net/abc/playlist.m3u8',
      securityKey: SECURITY_KEY,
      expiresAt: EXPIRES_AT,
      directoryPath: '/abc/'
    })

    expect(signedUrl).toBe(
      'https://token-tester.b-cdn.net/bcdn_token=HS256-IAfBLCYUODTlYvcX79PRxp3Wu5tNMexg1V4_XY8bgjs&token_path=%2Fabc%2F&expires=1598024587/abc/playlist.m3u8'
    )
  })
})

describe('toSharedExpiresAt', () => {
  const HOUR_START = 1_800_000_000
  const TTL_SECONDS = PLAYBACK_TOKEN_TTL_SECONDS

  it('should give every signature inside the same hour the same expiry', () => {
    expect(toSharedExpiresAt(HOUR_START + 1, TTL_SECONDS)).toBe(
      toSharedExpiresAt(HOUR_START + ONE_HOUR_IN_SECONDS - 1, TTL_SECONDS)
    )
  })

  it('should keep a signature valid for at least the TTL', () => {
    expect(toSharedExpiresAt(HOUR_START + 1, TTL_SECONDS)).toBe(
      HOUR_START + ONE_HOUR_IN_SECONDS + TTL_SECONDS
    )
    expect(toSharedExpiresAt(HOUR_START, TTL_SECONDS)).toBe(
      HOUR_START + TTL_SECONDS
    )
  })
})
