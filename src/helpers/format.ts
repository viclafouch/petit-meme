export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function truncateUrl(url: string) {
  try {
    const parsed = new URL(url)

    return `${parsed.hostname}${parsed.pathname}`.slice(0, 50)
  } catch {
    return url.slice(0, 50)
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
