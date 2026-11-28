import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { brotliCompressSync, constants } from 'node:zlib'
import { z } from 'zod'

const ROOT_ROUTE_ID = '__root__'
const BYTES_PER_KB = 1000
const BUDGET_HEADROOM_KB = 2
const BUILD_DIRECTORY = '.output'
const PUBLIC_DIRECTORY = join(BUILD_DIRECTORY, 'public')
const SERVER_DIRECTORY = join(BUILD_DIRECTORY, 'server')
const START_MANIFEST_FILE = /(?:^|\/)_tanstack-start-manifest_[^/]*\.mjs$/u
const CHUNK_HASH_SUFFIX = /-[\w-]{8}\.js$/u

export const BUDGET_FILE = 'bundle-budget.json'
export const KB_UNIT = '\u00A0kB'
export const BUDGET_HEADROOM = `${BUDGET_HEADROOM_KB}${KB_UNIT}`

const startManifestSchema = z.object({
  routes: z.record(
    z.string(),
    z.object({
      preloads: z.array(z.string()).optional(),
      scripts: z
        .array(z.object({ attrs: z.object({ src: z.string().optional() }) }))
        .optional()
    })
  )
})

const startManifestModuleSchema = z.object({
  tsrStartManifest: z.custom<() => z.input<typeof startManifestSchema>>(
    (value) => {
      return typeof value === 'function'
    }
  )
})

type StartManifestRoutes = z.infer<typeof startManifestSchema>['routes']

type StartManifestRoute = StartManifestRoutes[string]

const bytesSchema = z.number().int().nonnegative()

const jsSizeSchema = z.object({
  bytes: bytesSchema,
  chunks: z.record(z.string(), bytesSchema)
})

export type JsSize = z.infer<typeof jsSizeSchema>

export const bundleReportSchema = z.object({
  shell: jsSizeSchema,
  routes: z.record(z.string(), jsSizeSchema)
})

export type BundleReport = z.infer<typeof bundleReportSchema>

const kbByRouteSchema = z.record(z.string(), z.number().positive())

const bundleBudgetSchema = z.object({
  goal: z.object({
    startupJs: z.number().positive(),
    routeJs: z.number().positive(),
    firstViewCss: z.number().positive()
  }),
  shellJs: z.number().positive(),
  routeJs: kbByRouteSchema,
  firstViewCss: kbByRouteSchema
})

export type BundleBudget = z.infer<typeof bundleBudgetSchema>

export type BudgetedReport = {
  report: BundleReport
  budget: BundleBudget
}

export type BudgetLine = {
  name: string
  isShell: boolean
  size: JsSize
  budgetKb: number | undefined
}

export type BudgetViolation =
  | { kind: 'over'; name: string; bytes: number; budgetKb: number }
  | { kind: 'missing'; name: string; bytes: number }
  | { kind: 'stale'; name: string; budgetKb: number }

export type RaisedBudget = {
  kind: 'shellJs' | 'routeJs' | 'firstViewCss'
  name: string
  beforeKb: number
  afterKb: number
}

type StartupHrefs = {
  shell: readonly string[]
  routes: Record<string, readonly string[]>
}

export const toBrotliSize = (content: Uint8Array) => {
  return brotliCompressSync(content, {
    params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY }
  }).length
}

export const formatKb = (bytes: number) => {
  return `${(bytes / BYTES_PER_KB).toFixed(1)}${KB_UNIT}`
}

export const toBudgetBytes = (budgetKb: number) => {
  return budgetKb * BYTES_PER_KB
}

export const matchIsOverBudget = (bytes: number, budgetKb: number) => {
  return bytes > toBudgetBytes(budgetKb)
}

export const matchIsLineFailing = (line: BudgetLine) => {
  if (line.budgetKb === undefined) {
    return !line.isShell
  }

  return matchIsOverBudget(line.size.bytes, line.budgetKb)
}

export const toChunkName = (href: string) => {
  return (href.split('/').at(-1) ?? href).replace(CHUNK_HASH_SUFFIX, '')
}

const toJsHrefs = (route: StartManifestRoute) => {
  const scriptSources = (route.scripts ?? []).flatMap(({ attrs }) => {
    return attrs.src === undefined ? [] : [attrs.src]
  })

  return [...(route.preloads ?? []), ...scriptSources].filter((href) => {
    return href.endsWith('.js')
  })
}

const matchIsPathlessSegment = (segment: string) => {
  return segment.startsWith('_')
}

const matchIsPage = (routeId: string, routeIds: ReadonlySet<string>) => {
  const lastSegment = routeId.split('/').at(-1) ?? ''

  return (
    routeId !== ROOT_ROUTE_ID &&
    !matchIsPathlessSegment(lastSegment) &&
    !routeIds.has(`${routeId}/`)
  )
}

const matchIsSelfOrAncestor = (candidateId: string, routeId: string) => {
  return candidateId === routeId || routeId.startsWith(`${candidateId}/`)
}

const toRoutePath = (routeId: string) => {
  const segments = routeId.split('/').filter((segment) => {
    return segment !== '' && !matchIsPathlessSegment(segment)
  })

  return `/${segments.join('/')}`
}

export const listStartupHrefs = (routes: StartManifestRoutes): StartupHrefs => {
  const rootRoute = routes[ROOT_ROUTE_ID]

  if (rootRoute === undefined) {
    throw new Error('The TanStack Start manifest has no root route')
  }

  const shell = new Set(toJsHrefs(rootRoute))
  const routeIds = new Set(Object.keys(routes))
  const hrefsByRoutePath: Record<string, readonly string[]> = {}

  for (const pageId of routeIds) {
    if (!matchIsPage(pageId, routeIds)) {
      continue
    }

    const routePath = toRoutePath(pageId)

    if (Object.hasOwn(hrefsByRoutePath, routePath)) {
      throw new Error(`Two routes share the path ${routePath}`)
    }

    const pageHrefs = Object.entries(routes).flatMap(([candidateId, route]) => {
      return matchIsSelfOrAncestor(candidateId, pageId) ? toJsHrefs(route) : []
    })

    hrefsByRoutePath[routePath] = [...new Set(pageHrefs)].filter((href) => {
      return !shell.has(href)
    })
  }

  return { shell: [...shell], routes: hrefsByRoutePath }
}

type MeasureBundleParams = {
  startupHrefs: StartupHrefs
  sizeOf: (href: string) => number
}

export const measureBundle = ({
  startupHrefs,
  sizeOf
}: MeasureBundleParams): BundleReport => {
  const measureHrefs = (hrefs: readonly string[]): JsSize => {
    const chunks: Record<string, number> = {}

    for (const href of hrefs) {
      const chunkName = toChunkName(href)
      chunks[chunkName] = (chunks[chunkName] ?? 0) + sizeOf(href)
    }

    return {
      bytes: Object.values(chunks).reduce((total, bytes) => {
        return total + bytes
      }, 0),
      chunks
    }
  }

  return {
    shell: measureHrefs(startupHrefs.shell),
    routes: Object.fromEntries(
      Object.entries(startupHrefs.routes).map(([routePath, hrefs]) => {
        return [routePath, measureHrefs(hrefs)]
      })
    )
  }
}

export const toBudgetLines = ({
  report,
  budget
}: BudgetedReport): BudgetLine[] => {
  const routeLines = Object.entries(report.routes).map(
    ([routePath, size]): BudgetLine => {
      return {
        name: routePath,
        isShell: false,
        size,
        budgetKb: budget.routeJs[routePath]
      }
    }
  )

  return [
    {
      name: 'Shell',
      isShell: true,
      size: report.shell,
      budgetKb: budget.shellJs
    },
    ...routeLines
  ]
}

export const checkBudget = ({
  report,
  budget
}: BudgetedReport): BudgetViolation[] => {
  const lineViolations = toBudgetLines({ report, budget }).flatMap(
    (line): BudgetViolation[] => {
      if (!matchIsLineFailing(line)) {
        return []
      }

      return line.budgetKb === undefined
        ? [{ kind: 'missing', name: line.name, bytes: line.size.bytes }]
        : [
            {
              kind: 'over',
              name: line.name,
              bytes: line.size.bytes,
              budgetKb: line.budgetKb
            }
          ]
    }
  )

  const staleViolations = Object.entries(budget.routeJs).flatMap(
    ([routePath, budgetKb]): BudgetViolation[] => {
      return Object.hasOwn(report.routes, routePath)
        ? []
        : [{ kind: 'stale', name: routePath, budgetKb }]
    }
  )

  return [...lineViolations, ...staleViolations]
}

const toTightBudgetKb = (bytes: number) => {
  return Math.ceil(bytes / BYTES_PER_KB) + BUDGET_HEADROOM_KB
}

type BuildBudgetParams = BudgetedReport & {
  allowGrowth: boolean
}

export const buildBudget = ({
  report,
  budget,
  allowGrowth
}: BuildBudgetParams): BundleBudget => {
  const toUpdatedBudgetKb = (bytes: number, budgetKb: number | undefined) => {
    const tightBudgetKb = toTightBudgetKb(bytes)

    if (budgetKb === undefined) {
      return tightBudgetKb
    }

    return allowGrowth && matchIsOverBudget(bytes, budgetKb)
      ? tightBudgetKb
      : Math.min(budgetKb, tightBudgetKb)
  }

  const routeJs = Object.fromEntries(
    Object.entries(report.routes)
      .toSorted(([routeA], [routeB]) => {
        return routeA.localeCompare(routeB)
      })
      .map(([routePath, size]) => {
        return [
          routePath,
          toUpdatedBudgetKb(size.bytes, budget.routeJs[routePath])
        ]
      })
  )

  return {
    ...budget,
    shellJs: toUpdatedBudgetKb(report.shell.bytes, budget.shellJs),
    routeJs
  }
}

type ListRaisedBudgetsParams = {
  budget: BundleBudget
  baseBudget: BundleBudget
}

export const listRaisedBudgets = ({
  budget,
  baseBudget
}: ListRaisedBudgetsParams): RaisedBudget[] => {
  const toRaised = (
    kind: RaisedBudget['kind'],
    kbByRoute: Record<string, number>,
    baseKbByRoute: Record<string, number>
  ) => {
    return Object.entries(kbByRoute).flatMap(
      ([name, afterKb]): RaisedBudget[] => {
        const beforeKb = baseKbByRoute[name]

        return beforeKb === undefined || afterKb <= beforeKb
          ? []
          : [{ kind, name, beforeKb, afterKb }]
      }
    )
  }

  return [
    ...toRaised(
      'shellJs',
      { Shell: budget.shellJs },
      { Shell: baseBudget.shellJs }
    ),
    ...toRaised('routeJs', budget.routeJs, baseBudget.routeJs),
    ...toRaised('firstViewCss', budget.firstViewCss, baseBudget.firstViewCss)
  ]
}

export const listLooseBudgetLines = ({ report, budget }: BudgetedReport) => {
  return toBudgetLines({ report, budget }).filter((line) => {
    return (
      line.budgetKb !== undefined &&
      line.budgetKb - toTightBudgetKb(line.size.bytes) >= BUDGET_HEADROOM_KB
    )
  })
}

export const readBundleBudget = (path = BUDGET_FILE) => {
  return bundleBudgetSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
}

const findStartManifestPath = () => {
  const manifestPath = readdirSync(SERVER_DIRECTORY, { recursive: true })
    .map(String)
    .find((path) => {
      return START_MANIFEST_FILE.test(path)
    })

  if (manifestPath === undefined) {
    throw new Error(
      `No TanStack Start manifest in ${SERVER_DIRECTORY}: run \`pnpm run build:e2e\` first`
    )
  }

  return resolve(SERVER_DIRECTORY, manifestPath)
}

export const readStartupHrefs = async () => {
  const startManifestModule: unknown = await import(
    pathToFileURL(findStartManifestPath()).href
  )
  const { tsrStartManifest } =
    startManifestModuleSchema.parse(startManifestModule)

  return listStartupHrefs(startManifestSchema.parse(tsrStartManifest()).routes)
}

export const readBuiltAssetSize = (href: string) => {
  return toBrotliSize(readFileSync(join(PUBLIC_DIRECTORY, href)))
}
