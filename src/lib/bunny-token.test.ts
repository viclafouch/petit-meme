import { describe, expect, it } from 'vitest'
import { signBunnyUrl } from '~/lib/bunny-token'

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
