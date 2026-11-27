import {
  BUDGET_FILE,
  BUDGET_HEADROOM,
  type BudgetedReport,
  type BudgetLine,
  type BudgetViolation,
  type BundleReport,
  checkBudget,
  formatKb,
  type JsSize,
  listLooseBudgetLines,
  matchIsLineFailing,
  toBudgetBytes,
  toBudgetLines
} from './bundle-size.ts'

export const COMMENT_MARKER = '<!-- bundle-size-report -->'

const UNCHANGED_DELTA_BYTES = 100
const GROWTH_WARNING_BYTES = 1000
const VISIBLE_CHUNK_CHANGES = 10
const VISIBLE_LIST_ITEMS = 3
const AGENT_CHUNK_CHANGES = 40
const SHELL_SCOPE = 'shell'
const UPDATE_COMMAND = 'pnpm run bundle-size --update'
const MEASURE_COMMAND = 'pnpm run build:e2e && pnpm run bundle-size'

type BaseReport = {
  report: BundleReport
  label: string
  runId: string | undefined
}

type ChunkChange = {
  chunk: string
  deltaBytes: number
  loadedBy: string[]
}

type RouteChange = {
  name: string
  isShell: boolean
  beforeBytes: number | undefined
  afterBytes: number
}

type Verdict = 'fail' | 'grow' | 'tighten' | 'pass'

type FormatCommentParams = BudgetedReport & {
  base: BaseReport | undefined
  runUrl: string | undefined
}

const toBaseSize = (base: BaseReport | undefined, line: BudgetLine) => {
  return line.isShell ? base?.report.shell : base?.report.routes[line.name]
}

const formatSignedKb = (deltaBytes: number) => {
  return `${deltaBytes > 0 ? '+' : '−'}${formatKb(Math.abs(deltaBytes))}`
}

const formatDelta = (afterBytes: number, beforeBytes: number | undefined) => {
  if (beforeBytes === undefined) {
    return '🆕'
  }

  const deltaBytes = afterBytes - beforeBytes

  if (Math.abs(deltaBytes) < UNCHANGED_DELTA_BYTES) {
    return '·'
  }

  return `${deltaBytes > 0 ? '🔴' : '🟢'} ${formatSignedKb(deltaBytes)}`
}

const formatName = ({
  name,
  isShell
}: Pick<BudgetLine, 'name' | 'isShell'>) => {
  return isShell ? '**Shell** (every route)' : `\`${name}\``
}

const formatBudget = (line: BudgetLine) => {
  if (line.budgetKb === undefined) {
    return line.isShell ? '—' : '**no budget**'
  }

  const marginBytes = toBudgetBytes(line.budgetKb) - line.size.bytes

  return marginBytes < 0
    ? `${line.budgetKb} kB · **${formatKb(-marginBytes)} over**`
    : `${line.budgetKb} kB · ${formatKb(marginBytes)} left`
}

const formatStatus = (line: BudgetLine) => {
  if (!matchIsLineFailing(line)) {
    return '✅'
  }

  return line.budgetKb === undefined ? '🆕' : '❌'
}

const formatLineTable = (
  lines: readonly BudgetLine[],
  base: BaseReport | undefined,
  shellBytes: number
) => {
  return [
    '| | Route | Route JS | vs main | Budget | Startup JS |',
    '| :-: | --- | --: | --: | --- | --: |',
    ...lines.map((line) => {
      const cells = [
        formatStatus(line),
        formatName(line),
        formatKb(line.size.bytes),
        formatDelta(line.size.bytes, toBaseSize(base, line)?.bytes),
        formatBudget(line),
        line.isShell ? '—' : formatKb(shellBytes + line.size.bytes)
      ]

      return `| ${cells.join(' | ')} |`
    })
  ]
}

const listChunkChanges = (
  lines: readonly BudgetLine[],
  base: BaseReport
): ChunkChange[] => {
  const changeByChunk = new Map<string, ChunkChange>()

  for (const line of lines) {
    const beforeChunks: JsSize['chunks'] = toBaseSize(base, line)?.chunks ?? {}
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
        loadedBy: []
      }

      change.loadedBy.push(line.isShell ? SHELL_SCOPE : line.name)

      if (Math.abs(deltaBytes) > Math.abs(change.deltaBytes)) {
        change.deltaBytes = deltaBytes
      }

      changeByChunk.set(chunk, change)
    }
  }

  return [...changeByChunk.values()].toSorted((changeA, changeB) => {
    return Math.abs(changeB.deltaBytes) - Math.abs(changeA.deltaBytes)
  })
}

const formatTruncatedList = (items: readonly string[]) => {
  const visibleItems = items.slice(0, VISIBLE_LIST_ITEMS)
  const hiddenCount = items.length - visibleItems.length

  return hiddenCount > 0
    ? `${visibleItems.join(', ')} and ${hiddenCount} more`
    : visibleItems.join(', ')
}

const formatLoadedBy = (loadedBy: readonly string[]) => {
  return formatTruncatedList(
    loadedBy.map((scope) => {
      return scope === SHELL_SCOPE ? 'every route' : `\`${scope}\``
    })
  )
}

const formatChunkTable = (changes: readonly ChunkChange[]) => {
  return [
    '| Chunk | vs main | Loaded by |',
    '| --- | --: | --- |',
    ...changes.slice(0, VISIBLE_CHUNK_CHANGES).map((change) => {
      return `| \`${change.chunk}\` | ${formatDelta(change.deltaBytes, 0)} | ${formatLoadedBy(change.loadedBy)} |`
    })
  ]
}

const listRouteChanges = (
  lines: readonly BudgetLine[],
  base: BaseReport | undefined
): RouteChange[] => {
  if (base === undefined) {
    return []
  }

  return lines.flatMap((line) => {
    const beforeBytes = toBaseSize(base, line)?.bytes

    if (
      beforeBytes !== undefined &&
      Math.abs(line.size.bytes - beforeBytes) < UNCHANGED_DELTA_BYTES
    ) {
      return []
    }

    return [
      {
        name: line.name,
        isShell: line.isShell,
        beforeBytes,
        afterBytes: line.size.bytes
      }
    ]
  })
}

const formatViolation = (violation: BudgetViolation) => {
  switch (violation.kind) {
    case 'over':
      return `**\`${violation.name}\`** ships **${formatKb(violation.bytes)}**, ${formatKb(violation.bytes - toBudgetBytes(violation.budgetKb))} over its ${violation.budgetKb} kB budget.`
    case 'missing':
      return `**\`${violation.name}\`** is a new route with no budget yet (${formatKb(violation.bytes)}).`
    case 'stale':
      return `**\`${violation.name}\`** keeps a ${violation.budgetKb} kB budget but no longer exists.`
    default:
      return violation satisfies never
  }
}

const toAlert = (kind: string, lines: readonly string[]) => {
  return [
    `> [!${kind}]`,
    ...lines.map((line) => {
      return `> ${line}`
    }),
    ''
  ]
}

const toVerdict = (
  violations: readonly BudgetViolation[],
  growingChanges: readonly RouteChange[],
  looseLines: readonly BudgetLine[]
): Verdict => {
  if (violations.length > 0) {
    return 'fail'
  }

  if (growingChanges.length > 0) {
    return 'grow'
  }

  return looseLines.length > 0 ? 'tighten' : 'pass'
}

const HEADLINE_BY_VERDICT = {
  fail: '❌ Over budget',
  grow: '⚠️ Within budget, but growing',
  tighten: '✅ Within budget, and lighter',
  pass: '✅ Within budget'
} as const satisfies Record<Verdict, string>

const toAgentPrompt = (
  verdict: Verdict,
  violations: readonly BudgetViolation[],
  growingChanges: readonly RouteChange[]
) => {
  switch (verdict) {
    case 'fail':
      return [
        `The bundle-size check fails on this branch: ${violations
          .map((violation) => {
            return `\`${violation.name}\` (${violation.kind})`
          })
          .join(', ')}.`,
        'For a route over budget, read `chunkChanges` in the data below to see which chunks grew, then run `pnpm run build:analyze` and use the Chunks graph path selector in Vite DevTools to find the import that pulls them into the route. Move that code behind a dynamic import, swap it for a lighter dependency, or take it out of the route.',
        `For a route with no budget or a stale one, run \`${UPDATE_COMMAND}\` and commit \`${BUDGET_FILE}\`.`,
        `Raise a budget only when the growth is intended, with \`${UPDATE_COMMAND}\`, and say why in the PR description.`,
        `Done when \`${MEASURE_COMMAND}\` exits 0.`
      ].join('\n')
    case 'grow':
      return [
        `This change grows the startup JS of ${growingChanges.length} ${growingChanges.length === 1 ? 'route' : 'routes'} while staying within budget: ${growingChanges
          .map((change) => {
            return `\`${change.name}\``
          })
          .join(', ')}.`,
        'Check that each growth in `chunkChanges` is code the first view needs. Code a later interaction needs belongs behind a dynamic import.'
      ].join('\n')
    case 'tighten':
      return `Lock in the savings: run \`${UPDATE_COMMAND}\`, then commit \`${BUDGET_FILE}\`.`
    case 'pass':
      return null
    default:
      return verdict satisfies never
  }
}

type AgentBriefParams = {
  verdict: Verdict
  violations: readonly BudgetViolation[]
  routeChanges: readonly RouteChange[]
  growingChanges: readonly RouteChange[]
  chunkChanges: readonly ChunkChange[]
  base: BaseReport | undefined
}

const formatAgentBrief = ({
  verdict,
  violations,
  routeChanges,
  growingChanges,
  chunkChanges,
  base
}: AgentBriefParams) => {
  const prompt = toAgentPrompt(verdict, violations, growingChanges)
  const data = {
    verdict,
    base:
      base === undefined
        ? null
        : { commit: base.label, runId: base.runId ?? null },
    violations,
    routeChanges,
    chunkChanges: chunkChanges.slice(0, AGENT_CHUNK_CHANGES)
  }

  return [
    '<details>',
    '<summary>🤖 Agent brief</summary>',
    '',
    '**What this measures.** The Brotli size of each JS file the server-rendered page of a route modulepreloads, read from the TanStack Start manifest of `pnpm run build:e2e`. The shell is what the root route preloads on every page. Route JS is what a route adds on top, each file counted once. Startup JS is both. Sizes in the data are bytes.',
    '',
    `**Rules.** Budgets live in \`${BUDGET_FILE}\` as a ratchet: the size when last updated, plus ${BUDGET_HEADROOM}. Never raise one to turn the check green. Chunk names drop the Rolldown hash: \`meme-card\` stands for \`meme-card-<hash>.js\`. First-view CSS is gated apart, by \`e2e/first-view.spec.ts\` against \`firstViewCss\`.`,
    '',
    '**Reproduce**',
    '',
    '```sh',
    'pnpm run build:e2e',
    ...(base?.runId === undefined
      ? ['pnpm run bundle-size']
      : [
          `gh run download ${base.runId} --name bundle-size --dir /tmp/main-bundle-size`,
          'pnpm run bundle-size --base /tmp/main-bundle-size/report.json'
        ]),
    'pnpm run build:analyze',
    '```',
    '',
    ...(prompt === null
      ? []
      : ['**Prompt**', '', '```text', prompt, '```', '']),
    '**Data**',
    '',
    '```json',
    JSON.stringify(data, null, 2),
    '```',
    '',
    '</details>'
  ]
}

type HighlightedLinesParams = {
  lines: readonly BudgetLine[]
  base: BaseReport | undefined
  shellBytes: number
}

const formatHighlightedLines = ({
  lines,
  base,
  shellBytes
}: HighlightedLinesParams) => {
  if (lines.length > 0) {
    return [...formatLineTable(lines, base, shellBytes), '']
  }

  return base === undefined ? [] : ['No route changed against main.', '']
}

const formatGoal = ({ report, budget }: BudgetedReport) => {
  const heaviestRoute = Object.entries(report.routes)
    .toSorted(([, sizeA], [, sizeB]) => {
      return sizeB.bytes - sizeA.bytes
    })
    .at(0)

  if (heaviestRoute === undefined) {
    return []
  }

  const [heaviestName, heaviestSize] = heaviestRoute
  const heaviestStartupBytes = report.shell.bytes + heaviestSize.bytes
  const timesOverGoal =
    heaviestStartupBytes / toBudgetBytes(budget.goal.startupJs)

  return [
    `🎯 **Goal**: ${budget.goal.startupJs} kB of startup JS, ${budget.goal.routeJs} kB of route JS, ${budget.goal.firstViewCss} kB of first-view CSS. The heaviest route, \`${heaviestName}\`, starts with ${formatKb(heaviestStartupBytes)}, ${timesOverGoal.toFixed(1)}× the goal.`,
    ''
  ]
}

export const formatComment = ({
  report,
  budget,
  base,
  runUrl
}: FormatCommentParams) => {
  const lines = toBudgetLines({ report, budget }).toSorted((lineA, lineB) => {
    return (
      Number(lineB.isShell) - Number(lineA.isShell) ||
      lineB.size.bytes - lineA.size.bytes
    )
  })
  const violations = checkBudget({ report, budget })
  const looseLines = listLooseBudgetLines({ report, budget })
  const routeChanges = listRouteChanges(lines, base)
  const growingChanges = routeChanges.filter((change) => {
    return (
      change.beforeBytes !== undefined &&
      change.afterBytes - change.beforeBytes >= GROWTH_WARNING_BYTES
    )
  })
  const chunkChanges = base === undefined ? [] : listChunkChanges(lines, base)
  const verdict = toVerdict(violations, growingChanges, looseLines)
  const changedNames = new Set(
    routeChanges.map((change) => {
      return change.name
    })
  )
  const highlightedLines = lines.filter((line) => {
    return (
      matchIsLineFailing(line) ||
      (base !== undefined && changedNames.has(line.name))
    )
  })

  return [
    COMMENT_MARKER,
    `### 📦 Startup JS · ${HEADLINE_BY_VERDICT[verdict]}`,
    '',
    `<sub>Brotli · ${lines.length - 1} routes · ${base === undefined ? 'no main report yet' : `against main at \`${base.label}\``}${runUrl === undefined ? '' : ` · [workflow run](${runUrl})`}</sub>`,
    '',
    ...(violations.length > 0
      ? toAlert('CAUTION', violations.map(formatViolation))
      : []),
    ...(verdict === 'grow'
      ? toAlert(
          'WARNING',
          growingChanges.map((change) => {
            return `${formatName(change)} grows by ${formatSignedKb(change.afterBytes - (change.beforeBytes ?? 0))}.`
          })
        )
      : []),
    ...(looseLines.length > 0
      ? toAlert('TIP', [
          `${formatTruncatedList(
            looseLines.map((line) => {
              return formatName(line)
            })
          )} now ${looseLines.length === 1 ? 'needs' : 'need'} less than ${looseLines.length === 1 ? 'its budget' : 'their budgets'}. Run \`${UPDATE_COMMAND}\` to lock in the savings.`
        ])
      : []),
    ...(base === undefined
      ? toAlert('NOTE', [
          'The comparison starts once a push to `main` has uploaded its report.'
        ])
      : []),
    ...formatHighlightedLines({
      lines: highlightedLines,
      base,
      shellBytes: report.shell.bytes
    }),
    ...(chunkChanges.length === 0
      ? []
      : ['**What moved**', '', ...formatChunkTable(chunkChanges), '']),
    ...formatGoal({ report, budget }),
    '<details>',
    `<summary>📋 Every route</summary>`,
    '',
    ...formatLineTable(lines, base, report.shell.bytes),
    '',
    '</details>',
    '',
    ...formatAgentBrief({
      verdict,
      violations,
      routeChanges,
      growingChanges,
      chunkChanges,
      base
    }),
    ''
  ].join('\n')
}
