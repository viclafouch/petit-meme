type SignBunnyUrlParams = {
  url: string
  securityKey: string
  expirationSeconds: number
}

export const signBunnyUrl = async ({
  url,
  securityKey,
  expirationSeconds
}: SignBunnyUrlParams) => {
  const { createHash } = await import('node:crypto')
  const parsed = new URL(url)
  const expiration = Math.floor(Date.now() / 1000) + expirationSeconds

  const hashableBase = `${securityKey}${parsed.pathname}${expiration}`
  const token = createHash('sha256').update(hashableBase).digest('base64url')

  parsed.searchParams.set('token', token)
  parsed.searchParams.set('expires', String(expiration))

  return parsed.toString()
}
