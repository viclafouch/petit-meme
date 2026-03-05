export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
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
