export const processWithConcurrency = async <TItem, TResult extends string>(
  items: TItem[],
  concurrency: number,
  fn: (item: TItem, index: number) => Promise<TResult>
) => {
  const results: TResult[] = []
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      const item = items[index]

      if (item !== undefined) {
        // oxlint-disable-next-line no-await-in-loop -- intentional sequential processing within each concurrent worker
        results[index] = await fn(item, index)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => {
      return worker()
    })
  )

  return results
}

export const countResults = <TResult extends string>(results: TResult[]) => {
  const counts: Partial<Record<TResult, number>> = {}

  for (const result of results) {
    counts[result] = (counts[result] ?? 0) + 1
  }

  return counts
}
