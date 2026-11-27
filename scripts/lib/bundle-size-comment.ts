import {
  type BaseReport,
  type ChunkChange,
  EVERY_ROUTE_SCOPE,
  findStartupSize,
  listChunkChanges,
  UNCHANGED_DELTA_BYTES
} from './bundle-size-chunk-changes.ts'
import {
  BUDGET_FILE,
  BUDGET_HEADROOM,
  type BudgetedReport,
  type BudgetLine,
  type BudgetViolation,
  type BundleBudget,
  type BundleReport,
  checkBudget,
  formatKb,
  KB_UNIT,
  listLooseBudgetLines,
  listRaisedBudgets,
  matchIsLineFailing,
  type RaisedBudget,
  toBudgetBytes,
  toBudgetLines
} from './bundle-size.ts'

export const COMMENT_MARKER = '<!-- bundle-size-report -->'

const MARKER_GAP = '\u00A0'
const GROWTH_WARNING_BYTES = 1000
const VISIBLE_CHUNK_CHANGES = 10
const VISIBLE_LIST_ITEMS = 3
const AGENT_CHUNK_CHANGES = 40
const FAR_FROM_GOAL_RATIO = 2
const VISIBLE_GOAL_SQUARES = 10
const UPDATE_COMMAND = 'pnpm run bundle-size --update'
const ALLOW_GROWTH_FLAG = '--allow-growth'
const MEASURE_COMMAND = 'pnpm run build:e2e && pnpm run bundle-size'

type RouteChange = {
  name: string
  beforeBytes: number | undefined
  afterBytes: number
}

type Verdict = 'fail' | 'raised' | 'grow' | 'tighten' | 'pass'

type GoalRow = {
  label: string
  bytes: number
  goalKb: number
}

type FormatCommentParams = BudgetedReport & {
  baseBudget: BundleBudget | undefined
  base: BaseReport | undefined
  runUrl: string | undefined
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

  return `${deltaBytes > 0 ? '🔴' : '🟢'}${MARKER_GAP}${formatSignedKb(deltaBytes)}`
}

const formatName = ({
  name,
  isShell
}: Pick<BudgetLine, 'name' | 'isShell'>) => {
  return isShell ? '**Shell** (every route)' : `\`${name}\``
}

const RAISED_BUDGET_LABEL_BY_KIND = {
  shellJs: 'JS budget',
  routeJs: 'route JS budget',
  firstViewCss: 'first-view CSS budget'
} as const satisfies Record<RaisedBudget['kind'], string>

const findRaisedJsBudget = (
  raisedBudgets: readonly RaisedBudget[],
  line: BudgetLine
) => {
  return raisedBudgets.find((raisedBudget) => {
    return line.isShell
      ? raisedBudget.kind === 'shellJs'
      : raisedBudget.kind === 'routeJs' && raisedBudget.name === line.name
  })
}

const formatBudget = (
  line: BudgetLine,
  raisedBudget: RaisedBudget | undefined
) => {
  if (line.budgetKb === undefined) {
    return line.isShell ? '—' : '**no budget**'
  }

  const marginBytes = toBudgetBytes(line.budgetKb) - line.size.bytes
  const budget =
    raisedBudget === undefined
      ? `${line.budgetKb}${KB_UNIT}`
      : `🔴${MARKER_GAP}${line.budgetKb}${KB_UNIT}, was ${raisedBudget.beforeKb}${KB_UNIT}`

  return marginBytes < 0
    ? `${budget} · **${formatKb(-marginBytes)} over**`
    : `${budget} · ${formatKb(marginBytes)} left`
}

const formatStatus = (line: BudgetLine) => {
  if (!matchIsLineFailing(line)) {
    return '✅'
  }

  return line.budgetKb === undefined ? '🆕' : '❌'
}

type LineTableParams = {
  lines: readonly BudgetLine[]
  base: BaseReport | undefined
  raisedBudgets: readonly RaisedBudget[]
  shellBytes: number
}

const formatLineTable = ({
  lines,
  base,
  raisedBudgets,
  shellBytes
}: LineTableParams) => {
  return [
    '| | Route | Route JS | Budget | Startup JS | vs main |',
    '| :-: | --- | --: | --- | --: | --: |',
    ...lines.map((line) => {
      const startupBytes = shellBytes + line.size.bytes
      const cells = [
        formatStatus(line),
        formatName(line),
        formatKb(line.size.bytes),
        formatBudget(line, findRaisedJsBudget(raisedBudgets, line)),
        line.isShell ? '—' : formatKb(startupBytes),
        base === undefined || line.isShell
          ? '—'
          : formatDelta(
              startupBytes,
              findStartupSize(base.report, line.name)?.bytes
            )
      ]

      return `| ${cells.join(' | ')} |`
    })
  ]
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
      return scope === EVERY_ROUTE_SCOPE ? scope : `\`${scope}\``
    })
  )
}

const formatChunkDelta = (change: ChunkChange) => {
  if (
    change.renamedFrom !== undefined &&
    Math.abs(change.deltaBytes) < UNCHANGED_DELTA_BYTES
  ) {
    return `⚪${MARKER_GAP}renamed`
  }

  return change.deltaBytes > 0 && !change.isRegression
    ? `⚪${MARKER_GAP}${formatSignedKb(change.deltaBytes)}`
    : formatDelta(change.deltaBytes, 0)
}

const formatChunkName = (change: ChunkChange) => {
  return change.renamedFrom === undefined
    ? `\`${change.chunk}\``
    : `\`${change.renamedFrom}\` → \`${change.chunk}\``
}

const formatChunkTable = (changes: readonly ChunkChange[]) => {
  return [
    '| Chunk | vs main | Loaded by |',
    '| --- | --: | --- |',
    ...changes.slice(0, VISIBLE_CHUNK_CHANGES).map((change) => {
      return `| ${formatChunkName(change)} | ${formatChunkDelta(change)} | ${formatLoadedBy(change.loadedBy)} |`
    })
  ]
}

const listRouteChanges = (
  report: BundleReport,
  base: BaseReport | undefined
): RouteChange[] => {
  if (base === undefined) {
    return []
  }

  return Object.keys(report.routes).flatMap((name) => {
    const afterBytes = findStartupSize(report, name)?.bytes ?? 0
    const beforeBytes = findStartupSize(base.report, name)?.bytes

    if (
      beforeBytes !== undefined &&
      Math.abs(afterBytes - beforeBytes) < UNCHANGED_DELTA_BYTES
    ) {
      return []
    }

    return [{ name, beforeBytes, afterBytes }]
  })
}

const formatViolation = (violation: BudgetViolation) => {
  switch (violation.kind) {
    case 'over':
      return `**\`${violation.name}\`** ships **${formatKb(violation.bytes)}**, ${formatKb(violation.bytes - toBudgetBytes(violation.budgetKb))} over its ${violation.budgetKb}${KB_UNIT} budget.`
    case 'missing':
      return `**\`${violation.name}\`** is a new route with no budget yet (${formatKb(violation.bytes)}).`
    case 'stale':
      return `**\`${violation.name}\`** keeps a ${violation.budgetKb}${KB_UNIT} budget but no longer exists.`
    default:
      return violation satisfies never
  }
}

const formatRaisedBudget = (raisedBudget: RaisedBudget) => {
  const name =
    raisedBudget.kind === 'shellJs'
      ? '**Shell**'
      : `**\`${raisedBudget.name}\`**`

  return `🔴 ${name} raises its ${RAISED_BUDGET_LABEL_BY_KIND[raisedBudget.kind]} from ${raisedBudget.beforeKb}${KB_UNIT} to ${raisedBudget.afterKb}${KB_UNIT}.`
}

const toAlert = (kind: string, lines: readonly string[]) => {
  return [
    `> [!${kind}]`,
    ...lines.map((line) => {
      return line === '' ? '>' : `> ${line}`
    }),
    ''
  ]
}

type VerdictParams = {
  violations: readonly BudgetViolation[]
  raisedBudgets: readonly RaisedBudget[]
  growingChanges: readonly RouteChange[]
  looseLines: readonly BudgetLine[]
}

const toVerdict = ({
  violations,
  raisedBudgets,
  growingChanges,
  looseLines
}: VerdictParams): Verdict => {
  if (violations.length > 0) {
    return 'fail'
  }

  if (raisedBudgets.length > 0) {
    return 'raised'
  }

  if (growingChanges.length > 0) {
    return 'grow'
  }

  return looseLines.length > 0 ? 'tighten' : 'pass'
}

const HEADLINE_BY_VERDICT = {
  fail: '❌ Over budget',
  raised: '🔴 Budget raised',
  grow: '⚠️ Heavier, within budget',
  tighten: '✅ Lighter',
  pass: '✅ No heavier'
} as const satisfies Record<Verdict, string>

const WITHIN_BUDGET_HEADLINE = '✅ Within budget'

const formatNameList = (names: readonly string[]) => {
  return names
    .map((name) => {
      return `\`${name}\``
    })
    .join(', ')
}

type AgentPromptParams = {
  verdict: Verdict
  violations: readonly BudgetViolation[]
  raisedBudgets: readonly RaisedBudget[]
  growingChanges: readonly RouteChange[]
}

const toAgentPrompt = ({
  verdict,
  violations,
  raisedBudgets,
  growingChanges
}: AgentPromptParams) => {
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
        `\`${UPDATE_COMMAND}\` only lowers budgets. Raise one only when the growth is intended, with \`${UPDATE_COMMAND} ${ALLOW_GROWTH_FLAG}\`, and say why in the PR description.`,
        `Done when \`${MEASURE_COMMAND}\` exits 0.`
      ].join('\n')
    case 'raised':
      return [
        `This change raises ${raisedBudgets.length === 1 ? 'a budget' : `${raisedBudgets.length} budgets`} against main: ${formatNameList(
          raisedBudgets.map((raisedBudget) => {
            return raisedBudget.name
          })
        )}. See \`raisedBudgets\` in the data below.`,
        'Keep a raise only when the growth is intended, and say why in the PR description.',
        `Otherwise restore main's budgets with \`git checkout origin/main -- ${BUDGET_FILE}\`, then cut the growth until \`${MEASURE_COMMAND}\` exits 0.`
      ].join('\n')
    case 'grow':
      return [
        `This change grows the startup JS of ${growingChanges.length} ${growingChanges.length === 1 ? 'route' : 'routes'} while staying within budget: ${formatNameList(
          growingChanges.map((change) => {
            return change.name
          })
        )}.`,
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

type AgentBriefParams = AgentPromptParams & {
  routeChanges: readonly RouteChange[]
  chunkChanges: readonly ChunkChange[]
  base: BaseReport | undefined
  hasBaseBudget: boolean
}

const formatAgentBrief = ({
  verdict,
  violations,
  raisedBudgets,
  routeChanges,
  growingChanges,
  chunkChanges,
  base,
  hasBaseBudget
}: AgentBriefParams) => {
  const prompt = toAgentPrompt({
    verdict,
    violations,
    raisedBudgets,
    growingChanges
  })
  const data = {
    verdict,
    base:
      base === undefined
        ? null
        : { commit: base.label, runId: base.runId ?? null },
    violations,
    raisedBudgets,
    routeChanges,
    chunkChanges: chunkChanges.slice(0, AGENT_CHUNK_CHANGES)
  }
  const compareOptions = [
    ...(base?.runId === undefined
      ? []
      : ['--base /tmp/main-bundle-size/report.json']),
    ...(hasBaseBudget ? ['--base-budget /tmp/main-budget.json'] : [])
  ]

  return [
    '<details>',
    '<summary>🤖 Agent brief</summary>',
    '',
    '**What this measures.** The Brotli size of each JS file the server-rendered page of a route modulepreloads, read from the TanStack Start manifest of `pnpm run build:e2e`. The shell is what the root route preloads on every page. Route JS is what a route adds on top, each file counted once. Startup JS is both, and every comparison with main runs on it: Rolldown moves code between the shell and the routes from one build to the next, and only the startup JS of a page tells what its visitor downloads. Sizes in the data are bytes.',
    '',
    `**Rules.** Budgets live in \`${BUDGET_FILE}\` as a one-way ratchet: the size when last updated, plus ${BUDGET_HEADROOM}. \`${UPDATE_COMMAND}\` only lowers them, and \`${ALLOW_GROWTH_FLAG}\` raises them, flagged in red against main. Never raise one to turn the check green. Chunk names drop the Rolldown hash: \`meme-card\` stands for \`meme-card-<hash>.js\`. Two chunks with the same name add up, and a chunk loaded by every route reads \`every route\`. A chunk that grows while no route loading it gets heavier shows ⚪, with \`isRegression: false\`: Rolldown renamed or merged it, and only red chunks explain a heavier route. A chunk Rolldown renamed reads \`old\` → \`new\`, with \`renamedFrom\`. First-view CSS is gated apart, by \`e2e/first-view.spec.ts\` against \`firstViewCss\`.`,
    '',
    '**Reproduce**',
    '',
    '```sh',
    'pnpm run build:e2e',
    ...(base?.runId === undefined
      ? []
      : [
          `gh run download ${base.runId} --name bundle-size --dir /tmp/main-bundle-size`
        ]),
    ...(hasBaseBudget
      ? [`git show origin/main:${BUDGET_FILE} > /tmp/main-budget.json`]
      : []),
    ['pnpm run bundle-size', ...compareOptions].join(' '),
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

const formatHighlightedLines = (params: LineTableParams) => {
  if (params.lines.length > 0) {
    return [...formatLineTable(params), '']
  }

  return params.base === undefined ? [] : ['No route changed against main.', '']
}

const toGoalRatio = ({ bytes, goalKb }: GoalRow) => {
  return bytes / toBudgetBytes(goalKb)
}

const formatGoalDistance = (row: GoalRow) => {
  const ratio = toGoalRatio(row)
  const squareCount = Math.min(Math.ceil(ratio), VISIBLE_GOAL_SQUARES)
  const squares = `🟩${'🟥'.repeat(Math.max(squareCount - 1, 0))}${Math.ceil(ratio) > VISIBLE_GOAL_SQUARES ? '…' : ''}`

  return `${squares} ${ratio.toFixed(1)}×`
}

const toGoalAlert = (worstRatio: number) => {
  if (worstRatio >= FAR_FROM_GOAL_RATIO) {
    return { kind: 'CAUTION', title: 'Far from the goal.' }
  }

  return worstRatio > 1
    ? { kind: 'WARNING', title: 'Above the goal.' }
    : { kind: 'TIP', title: 'Within the goal.' }
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
  const rows: GoalRow[] = [
    {
      label: `Startup JS of \`${heaviestName}\`, the heaviest route`,
      bytes: report.shell.bytes + heaviestSize.bytes,
      goalKb: budget.goal.startupJs
    },
    {
      label: formatName({ name: 'Shell', isShell: true }),
      bytes: report.shell.bytes,
      goalKb: budget.goal.startupJs
    },
    {
      label: `Route JS of \`${heaviestName}\``,
      bytes: heaviestSize.bytes,
      goalKb: budget.goal.routeJs
    }
  ]
  const { kind, title } = toGoalAlert(Math.max(...rows.map(toGoalRatio)))

  return toAlert(kind, [
    `**${title}** 🟩 is the goal, each 🟥 one more goal’s worth.`,
    '',
    '| | Now | Goal | Distance |',
    '| --- | --: | --: | --- |',
    ...rows.map((row) => {
      return `| ${row.label} | ${formatKb(row.bytes)} | ${row.goalKb}${KB_UNIT} | ${formatGoalDistance(row)} |`
    })
  ])
}

export const formatComment = ({
  report,
  budget,
  baseBudget,
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
  const raisedBudgets =
    baseBudget === undefined ? [] : listRaisedBudgets({ budget, baseBudget })
  const looseLines = listLooseBudgetLines({ report, budget })
  const routeChanges = listRouteChanges(report, base)
  const growingChanges = routeChanges.filter((change) => {
    return (
      change.beforeBytes !== undefined &&
      change.afterBytes - change.beforeBytes >= GROWTH_WARNING_BYTES
    )
  })
  const chunkChanges = base === undefined ? [] : listChunkChanges(report, base)
  const hasHeavierRoute = routeChanges.some((change) => {
    return change.afterBytes > (change.beforeBytes ?? 0)
  })
  const verdict = toVerdict({
    violations,
    raisedBudgets,
    growingChanges,
    looseLines
  })
  const changedNames = new Set(
    routeChanges.map((change) => {
      return change.name
    })
  )
  const highlightedLines = lines.filter((line) => {
    return (
      matchIsLineFailing(line) ||
      findRaisedJsBudget(raisedBudgets, line) !== undefined ||
      (base !== undefined && changedNames.has(line.name))
    )
  })
  const cautions = [
    ...violations.map(formatViolation),
    ...raisedBudgets.map(formatRaisedBudget)
  ]

  return [
    COMMENT_MARKER,
    `### 📦 Startup JS · ${verdict === 'pass' && (base === undefined || hasHeavierRoute) ? WITHIN_BUDGET_HEADLINE : HEADLINE_BY_VERDICT[verdict]}`,
    '',
    `<sub>Brotli · ${lines.length - 1} routes · ${base === undefined ? 'no main report yet' : `against main at \`${base.label}\``}${runUrl === undefined ? '' : ` · [workflow run](${runUrl})`}</sub>`,
    '',
    ...(cautions.length > 0 ? toAlert('CAUTION', cautions) : []),
    ...(growingChanges.length > 0 && violations.length === 0
      ? toAlert(
          'WARNING',
          growingChanges.map((change) => {
            return `\`${change.name}\` grows by ${formatSignedKb(change.afterBytes - (change.beforeBytes ?? 0))}.`
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
      raisedBudgets,
      shellBytes: report.shell.bytes
    }),
    ...(chunkChanges.length === 0
      ? []
      : ['**What moved**', '', ...formatChunkTable(chunkChanges), '']),
    ...formatGoal({ report, budget }),
    '<details>',
    `<summary>📋 Every route</summary>`,
    '',
    ...formatLineTable({
      lines,
      base,
      raisedBudgets,
      shellBytes: report.shell.bytes
    }),
    '',
    '</details>',
    '',
    ...formatAgentBrief({
      verdict,
      violations,
      raisedBudgets,
      routeChanges,
      growingChanges,
      chunkChanges,
      base,
      hasBaseBudget: baseBudget !== undefined
    }),
    ''
  ].join('\n')
}
