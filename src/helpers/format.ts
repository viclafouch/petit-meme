const TRUNCATED_URL_MAX_LENGTH = 50

export function truncateUrl(url: string) {
  try {
    const parsed = new URL(url)

    return `${parsed.hostname}${parsed.pathname}`.slice(
      0,
      TRUNCATED_URL_MAX_LENGTH
    )
  } catch {
    return url.slice(0, TRUNCATED_URL_MAX_LENGTH)
  }
}

export function getUserInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  return parts
    .slice(0, 2)
    .map((part) => {
      return part[0]
    })
    .join('')
    .toUpperCase()
}
