import type { BudgetLine, BundleReport, JsSize } from './bundle-size.ts'

export const UNCHANGED_DELTA_BYTES = 100
export const SHELL_SCOPE = 'shell'
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

export const toBaseSize = (base: BaseReport | undefined, line: BudgetLine) => {
  return line.isShell ? base?.report.shell : base?.report.routes[line.name]
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
  lines: readonly BudgetLine[],
  base: BaseReport
): ChunkChange[] => {
  const changeByChunk = new Map<string, ChunkChange>()

  for (const line of lines) {
    const baseSize = toBaseSize(base, line)
    const beforeChunks: JsSize['chunks'] = baseSize?.chunks ?? {}
    const isLineHeavier =
      line.size.bytes - (baseSize?.bytes ?? 0) >= UNCHANGED_DELTA_BYTES
    const chunkNames = new Set([
      ...Object.keys(beforeChunks),
      ...Object.keys(line.size.chunks)
    ])

    for (const chunk of chunkNames) {
      const deltaBytes =
        (line.size.chunks[chunk] ?? 0) - (beforeChunks[chunk] ?? 0)

      if (Math.abs(deltaBytes) < UNCHANGED_DELTA_BYTES) {
        continue
      }

      const change = changeByChunk.get(chunk) ?? {
        chunk,
        deltaBytes,
        loadedBy: [],
        isRegression: false
      }

      change.loadedBy.push(line.isShell ? SHELL_SCOPE : line.name)
      change.isRegression ||= deltaBytes > 0 && isLineHeavier

      if (Math.abs(deltaBytes) > Math.abs(change.deltaBytes)) {
        change.deltaBytes = deltaBytes
      }

      changeByChunk.set(chunk, change)
    }
  }

  return pairRenamedChunks(
    [...changeByChunk.values()].toSorted((changeA, changeB) => {
      return Math.abs(changeB.deltaBytes) - Math.abs(changeA.deltaBytes)
    })
  )
}
