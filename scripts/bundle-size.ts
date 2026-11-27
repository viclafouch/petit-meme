import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { formatComment } from './lib/bundle-size-comment.ts'
import {
  BUDGET_FILE,
  buildBudget,
  bundleReportSchema,
  checkBudget,
  formatKb,
  KB_UNIT,
  measureBundle,
  readBuiltAssetSize,
  readBundleBudget,
  readStartupHrefs
} from './lib/bundle-size.ts'

const REPORT_DIRECTORY = join('.output', 'bundle-size')

const { values: options } = parseArgs({
  options: {
    base: { type: 'string' },
    'base-label': { type: 'string', default: 'main' },
    'base-run': { type: 'string' },
    'base-budget': { type: 'string' },
    'allow-growth': { type: 'boolean', default: false },
    'run-url': { type: 'string' },
    update: { type: 'boolean', default: false }
  }
})

const sizeByHref = new Map<string, number>()

const report = measureBundle({
  startupHrefs: await readStartupHrefs(),
  sizeOf: (href) => {
    const size = sizeByHref.get(href) ?? readBuiltAssetSize(href)
    sizeByHref.set(href, size)

    return size
  }
})

const budget = readBundleBudget()

if (options.update) {
  const updatedBudget = buildBudget({
    report,
    budget,
    allowGrowth: options['allow-growth']
  })
  const keptViolations = checkBudget({ report, budget: updatedBudget }).filter(
    (violation) => {
      return violation.kind === 'over'
    }
  )

  writeFileSync(BUDGET_FILE, `${JSON.stringify(updatedBudget, null, 2)}\n`)

  if (keptViolations.length === 0) {
    console.log(`${BUDGET_FILE} now holds the current sizes`)
  } else {
    console.error(
      [
        `${BUDGET_FILE} keeps ${keptViolations.length === 1 ? 'a budget' : 'budgets'} below the measured size, since --update only lowers them:`,
        ...keptViolations.map((violation) => {
          return `  ${violation.name}: ${formatKb(violation.bytes)} measured, ${violation.budgetKb}${KB_UNIT} budget`
        }),
        'Cut the growth, or raise them on purpose with --allow-growth and say why in the pull request.'
      ].join('\n')
    )
    process.exitCode = 1
  }
} else {
  const comment = formatComment({
    report,
    budget,
    baseBudget:
      options['base-budget'] === undefined
        ? undefined
        : readBundleBudget(options['base-budget']),
    base:
      options.base === undefined
        ? undefined
        : {
            report: bundleReportSchema.parse(
              JSON.parse(readFileSync(options.base, 'utf8'))
            ),
            label: options['base-label'],
            runId: options['base-run']
          },
    runUrl: options['run-url']
  })

  mkdirSync(REPORT_DIRECTORY, { recursive: true })
  writeFileSync(
    join(REPORT_DIRECTORY, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  )
  writeFileSync(join(REPORT_DIRECTORY, 'comment.md'), comment)
  console.log(comment)

  if (checkBudget({ report, budget }).length > 0) {
    process.exitCode = 1
  }
}
