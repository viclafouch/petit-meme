import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { formatComment } from './lib/bundle-size-comment.ts'
import {
  BUDGET_FILE,
  buildBudget,
  bundleReportSchema,
  checkBudget,
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
  writeFileSync(
    BUDGET_FILE,
    `${JSON.stringify(buildBudget({ report, budget }), null, 2)}\n`
  )
  console.log(`${BUDGET_FILE} now holds the current sizes`)
} else {
  const comment = formatComment({
    report,
    budget,
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
