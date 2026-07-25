const UNKNOWN_CLIENT_IP = 'unknown'

export const extractClientIp = (headers: Headers) => {
  const realIp = headers.get('x-real-ip')

  if (realIp) {
    return realIp.trim()
  }

  const forwarded = headers.get('x-forwarded-for')

  if (forwarded) {
    const ips = forwarded.split(',')

    return ips.at(-1)?.trim() ?? UNKNOWN_CLIENT_IP
  }

  return UNKNOWN_CLIENT_IP
}
