const formatCount = (count: number, singular: string, plural: string) => {
  return `${count} ${count > 1 ? plural : singular}`
}

export const formatReadyDraftsLabel = (count: number) => {
  return formatCount(count, 'brouillon prêt', 'brouillons prêts')
}

export const formatFailuresLabel = (count: number) => {
  return formatCount(count, 'échec', 'échecs')
}

type FormatMemeFillDigestSummaryParams = {
  readyDrafts: readonly unknown[]
  failures: readonly unknown[]
}

export const formatMemeFillDigestSummary = ({
  readyDrafts,
  failures
}: FormatMemeFillDigestSummaryParams) => {
  return [
    readyDrafts.length > 0 ? formatReadyDraftsLabel(readyDrafts.length) : null,
    failures.length > 0 ? formatFailuresLabel(failures.length) : null
  ]
    .filter((label) => {
      return label !== null
    })
    .join(', ')
}
