type SignBunnyUrlParams = {
  url: string
  securityKey: string
  expiresAt: number
  directoryPath?: string
}

export const signBunnyUrl = async ({
  url,
  securityKey,
  expiresAt,
  directoryPath
}: SignBunnyUrlParams) => {
  const { createHmac } = await import('node:crypto')
  const { origin, pathname } = new URL(url)
  const expires = String(expiresAt)
  const signedParameters =
    directoryPath === undefined ? '' : `token_path=${directoryPath}`
  const digest = createHmac('sha256', securityKey)
    .update(`${directoryPath ?? pathname}${expires}${signedParameters}`)
    .digest('base64url')
  const token = `HS256-${digest}`

  if (directoryPath === undefined) {
    return `${origin}${pathname}?token=${token}&expires=${expires}`
  }

  return `${origin}/bcdn_token=${token}&token_path=${encodeURIComponent(directoryPath)}&expires=${expires}${pathname}`
}
