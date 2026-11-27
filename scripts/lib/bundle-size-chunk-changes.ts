import type { BundleReport, JsSize } from './bundle-size.ts'

export const UNCHANGED_DELTA_BYTES = 100
export const EVERY_ROUTE_SCOPE = 'every route'
const RENAME_TOLERANCE = 0.02

export type BaseReport = {
  report: BundleReport
  label: string
  runId: string | undefined
}

export type ChunkChange = {
  chunk: string
  deltaBytes: number
  loadedBy: string[]
  isRegression: boolean
  renamedFrom?: string
}

const addChunkSizes = (sizeA: JsSize, sizeB: JsSize): JsSize => {
  const chunks = { ...sizeA.chunks }

  for (const [chunk, bytes] of Object.entries(sizeB.chunks)) {
    chunks[chunk] = (chunks[chunk] ?? 0) + bytes
  }

  return { bytes: sizeA.bytes + sizeB.bytes, chunks }
}

export const findStartupSize = (report: BundleReport, routeName: string) => {
  const routeSize = report.routes[routeName]

  return routeSize === undefined
    ? undefined
    : addChunkSizes(report.shell, routeSize)
}

const matchIsSameScope = (changeA: ChunkChange, changeB: ChunkChange) => {
  return changeA.loadedBy.join('\n') === changeB.loadedBy.join('\n')
}

const matchIsRenameOf = (grown: ChunkChange, shrunk: ChunkChange) => {
  return (
    shrunk.deltaBytes < 0 &&
    matchIsSameScope(grown, shrunk) &&
    Math.abs(grown.deltaBytes + shrunk.deltaBytes) <=
      Math.max(UNCHANGED_DELTA_BYTES, grown.deltaBytes * RENAME_TOLERANCE)
  )
}

const pairRenamedChunks = (changes: readonly ChunkChange[]) => {
  const renamedSources = new Set<ChunkChange>()
  const sourceByGrown = new Map<ChunkChange, ChunkChange>()

  for (const grown of changes) {
    if (grown.deltaBytes <= 0 || grown.isRegression) {
      continue
    }

    const source = changes.find((shrunk) => {
      return !renamedSources.has(shrunk) && matchIsRenameOf(grown, shrunk)
    })

    if (source !== undefined) {
      renamedSources.add(source)
      sourceByGrown.set(grown, source)
    }
  }

  return changes.flatMap((change): ChunkChange[] => {
    if (renamedSources.has(change)) {
      return []
    }

    const source = sourceByGrown.get(change)

    return source === undefined
      ? [change]
      : [
          {
            ...change,
            renamedFrom: source.chunk,
            deltaBytes: change.deltaBytes + source.deltaBytes
          }
        ]
  })
}

export const listChunkChanges = (
  report: BundleReport,
  base: BaseReport
): ChunkChange[] => {
  const changeByChunk = new Map<string, ChunkChange>()
  const routeNames = Object.keys(report.routes)

  for (const routeName of routeNames) {
    const afterSize = findStartupSize(report, routeName)
    const beforeSize = findStartupSize(base.report, routeName)

    if (afterSize === undefined) {
      continue
    }

    const beforeChunks: JsSize['chunks'] = beforeSize?.chunks ?? {}
    const isRouteHeavier =
      afterSize.bytes - (beforeSize?.bytes ?? 0) >= UNCHANGED_DELTA_BYTES
    const chunkNames = new Set([
      ...Object.keys(beforeChunks),
      ...Object.keys(afterSize.chunks)
    ])

    for (const chunk of chunkNames) {
      const deltaBytes =
        (afterSize.chunks[chunk] ?? 0) - (beforeChunks[chunk] ?? 0)

      if (Math.abs(deltaBytes) < UNCHANGED_DELTA_BYTES) {
        continue
      }

      const change = changeByChunk.get(chunk) ?? {
        chunk,
        deltaBytes,
        loadedBy: [],
        isRegression: false
      }

      change.loadedBy.push(routeName)
      change.isRegression ||= deltaBytes > 0 && isRouteHeavier

      if (Math.abs(deltaBytes) > Math.abs(change.deltaBytes)) {
        change.deltaBytes = deltaBytes
      }

      changeByChunk.set(chunk, change)
    }
  }

  const changes = [...changeByChunk.values()].map((change) => {
    return change.loadedBy.length === routeNames.length
      ? { ...change, loadedBy: [EVERY_ROUTE_SCOPE] }
      : change
  })

  return pairRenamedChunks(
    changes.toSorted((changeA, changeB) => {
      return Math.abs(changeB.deltaBytes) - Math.abs(changeA.deltaBytes)
    })
  )
}
