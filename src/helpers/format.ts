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

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
