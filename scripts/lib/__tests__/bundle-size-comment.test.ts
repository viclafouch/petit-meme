import { describe, expect, it } from 'vitest'
import type { BundleBudget, BundleReport } from '../bundle-size'
import { COMMENT_MARKER, formatComment } from '../bundle-size-comment'

const MAIN_REPORT: BundleReport = {
  shell: { bytes: 150_000, chunks: { entry: 100_000, react: 50_000 } },
  routes: {
    '/': { bytes: 20_000, chunks: { home: 20_000 } },
    '/memes/$memeId': { bytes: 30_000, chunks: { meme: 25_000, card: 5000 } }
  }
}

const BUDGET: BundleBudget = {
  goal: { startupJs: 150, routeJs: 50, firstViewCss: 20 },
  shellJs: 152,
  routeJs: { '/': 22, '/memes/$memeId': 32 },
  firstViewCss: { '/': 33 }
}

const GROWN_REPORT: BundleReport = {
  ...MAIN_REPORT,
  routes: {
    ...MAIN_REPORT.routes,
    '/memes/$memeId': {
      bytes: 41_000,
      chunks: { meme: 25_000, card: 5000, player: 11_000 }
    }
  }
}

const BASE = { report: MAIN_REPORT, label: 'abc1234', runId: '42' }

const toAgentData = (comment: string) => {
  const brief = comment.slice(comment.indexOf('🤖 Agent brief'))
  const json = brief.slice(
    brief.indexOf('```json') + '```json'.length,
    brief.lastIndexOf('```')
  )

  return JSON.parse(json) as unknown
}

describe('formatComment', () => {
  it('should open with the marker the workflow finds the comment by', () => {
    expect(
      formatComment({
        report: MAIN_REPORT,
        budget: BUDGET,
        base: BASE,
        runUrl: undefined
      }).startsWith(COMMENT_MARKER)
    ).toBe(true)
  })

  it('should tell the developer which route went over, which chunk moved, and brief the agent', () => {
    const comment = formatComment({
      report: GROWN_REPORT,
      budget: BUDGET,
      base: BASE,
      runUrl: 'https://github.com/run/1'
    })

    expect(comment).toContain('### 📦 Startup JS · ❌ Over budget')
    expect(comment).toContain(
      '> [!CAUTION]\n> **`/memes/$memeId`** ships **41.0 kB**, 9.0 kB over its 32 kB budget.'
    )
    expect(comment).toContain('| `player` | 🔴 +11.0 kB | `/memes/$memeId` |')
    expect(comment).toContain(
      'gh run download 42 --name bundle-size --dir /tmp/main-bundle-size'
    )
    expect(toAgentData(comment)).toMatchObject({
      verdict: 'fail',
      base: { commit: 'abc1234', runId: '42' },
      violations: [
        { kind: 'over', name: '/memes/$memeId', bytes: 41_000, budgetKb: 32 }
      ],
      routeChanges: [
        { name: '/memes/$memeId', beforeBytes: 30_000, afterBytes: 41_000 }
      ],
      chunkChanges: [
        { chunk: 'player', deltaBytes: 11_000, loadedBy: ['/memes/$memeId'] }
      ]
    })
  })

  it('should warn about growth that stays within budget', () => {
    const comment = formatComment({
      report: GROWN_REPORT,
      budget: {
        ...BUDGET,
        routeJs: { ...BUDGET.routeJs, '/memes/$memeId': 45 }
      },
      base: BASE,
      runUrl: undefined
    })

    expect(comment).toContain(
      '### 📦 Startup JS · ⚠️ Within budget, but growing'
    )
    expect(comment).toContain('> `/memes/$memeId` grows by +11.0 kB.')
  })

  it('should say when nothing changed, and leave the prompt out', () => {
    const comment = formatComment({
      report: MAIN_REPORT,
      budget: BUDGET,
      base: BASE,
      runUrl: undefined
    })

    expect(comment).toContain('### 📦 Startup JS · ✅ Within budget')
    expect(comment).toContain('No route changed against main.')
    expect(comment).not.toContain('**Prompt**')
  })

  it('should explain the missing comparison before main has a report', () => {
    const comment = formatComment({
      report: MAIN_REPORT,
      budget: BUDGET,
      base: undefined,
      runUrl: undefined
    })

    expect(comment).toContain('> [!NOTE]')
    expect(comment).toContain('pnpm run bundle-size\npnpm run build:analyze')
  })
})
