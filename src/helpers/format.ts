export const formatDisplayUrl = (url: string) => {
  try {
    const parsed = new URL(url)

    return `${parsed.hostname}${parsed.pathname}`
  } catch {
    return url
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
