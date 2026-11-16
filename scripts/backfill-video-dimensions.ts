import { parseArgs } from 'node:util'
import { countResults } from './lib/concurrency'
import { logEnvironmentInfo } from './lib/env-guard'
import { backfillVideoDimensions } from './lib/video-dimensions'

const main = async () => {
  const { values } = parseArgs({
    options: { 'dry-run': { type: 'boolean', default: false } }
  })
  const dryRun = values['dry-run']

  logEnvironmentInfo()
  console.log(`Mode:            ${dryRun ? 'DRY RUN' : 'WRITE'}\n`)

  const counts = countResults(await backfillVideoDimensions(dryRun))

  console.log('\n--- Summary ---')

  if (dryRun) {
    console.log(`To process:         ${counts['to-process'] ?? 0}`)
  } else {
    console.log(`Done:               ${counts.done ?? 0}`)
  }

  console.log(`Unknown dimensions: ${counts['unknown-dimensions'] ?? 0}`)
  console.log(`Failed:             ${counts.failed ?? 0}`)

  process.exit((counts.failed ?? 0) > 0 ? 1 : 0)
}

void main()
