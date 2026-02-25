const pluralRules = new Intl.PluralRules('fr')

type PluralFormsParams = {
  one: string
  other: string
}

export function pluralize(count: number, { one, other }: PluralFormsParams) {
  return pluralRules.select(count) === 'one' ? one : other
}

export function formatViewCount(count: number) {
  return `${count} ${pluralize(count, { one: 'vue', other: 'vues' })}`
}

export function formatCategoryCount(count: number) {
  if (count === 0) {
    return 'Aucune catégorie'
  }

  return `${count} ${pluralize(count, { one: 'catégorie', other: 'catégories' })}`
}

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
