export const removeDuplicates = <TItem>(array: TItem[]) => {
  return [...new Set(array)]
}

export const groupToMap = <TItem, TKey>(
  items: Iterable<TItem>,
  toKey: (item: TItem) => TKey
) => {
  const groups = new Map<TKey, TItem[]>()

  for (const item of items) {
    const key = toKey(item)
    const group = groups.get(key)

    if (group) {
      group.push(item)
    } else {
      groups.set(key, [item])
    }
  }

  return groups
}
