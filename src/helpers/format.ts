export function formatViewCount(count: number) {
  return `${count} vue${count > 1 ? 's' : ''}`
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
