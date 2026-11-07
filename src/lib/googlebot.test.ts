import { describe, expect, it } from 'vitest'
import { matchIsGooglebotIp } from '~/lib/googlebot'

const GOOGLEBOT_IP_RANGES = {
  creationTime: '2026-11-06T15:46:11.000000',
  prefixes: [
    { ipv4Prefix: '192.178.4.0/27' },
    { ipv6Prefix: '2001:4860:4801:10::/64' }
  ]
}

describe('matchIsGooglebotIp', () => {
  it('should accept an IPv4 address inside a Googlebot range', () => {
    expect(
      matchIsGooglebotIp({ ip: '192.178.4.31', ranges: GOOGLEBOT_IP_RANGES })
    ).toBe(true)
  })

  it('should accept an IPv6 address inside a Googlebot range', () => {
    expect(
      matchIsGooglebotIp({
        ip: '2001:4860:4801:10::abcd',
        ranges: GOOGLEBOT_IP_RANGES
      })
    ).toBe(true)
  })

  it('should refuse an address next to a Googlebot range', () => {
    expect(
      matchIsGooglebotIp({ ip: '192.178.4.32', ranges: GOOGLEBOT_IP_RANGES })
    ).toBe(false)
  })

  it('should refuse a value that is not an IP address', () => {
    expect(
      matchIsGooglebotIp({ ip: 'unknown', ranges: GOOGLEBOT_IP_RANGES })
    ).toBe(false)
  })
})
