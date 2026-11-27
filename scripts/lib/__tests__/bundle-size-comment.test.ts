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
        baseBudget: BUDGET,
        base: BASE,
        runUrl: undefined
      }).startsWith(COMMENT_MARKER)
    ).toBe(true)
  })

  it('should tell the developer which route went over, which chunk moved, and brief the agent', () => {
    const comment = formatComment({
      report: GROWN_REPORT,
      budget: BUDGET,
      baseBudget: BUDGET,
      base: BASE,
      runUrl: 'https://github.com/run/1'
    })

    expect(comment).toContain('### 📦 Startup JS · ❌ Over budget')
    expect(comment).toContain(
      '> [!CAUTION]\n> **`/memes/$memeId`** ships **41.0\u00A0kB**, 9.0\u00A0kB over its 32\u00A0kB budget.'
    )
    expect(comment).toContain(
      '| `player` | 🔴\u00A0+11.0\u00A0kB | `/memes/$memeId` |'
    )
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
        {
          chunk: 'player',
          deltaBytes: 11_000,
          loadedBy: ['/memes/$memeId'],
          isRegression: true
        }
      ]
    })
  })

  it('should keep a chunk neutral when it grows while no route loading it gets heavier', () => {
    const rechunkedReport: BundleReport = {
      ...MAIN_REPORT,
      shell: {
        bytes: 145_000,
        chunks: { entry: 85_000, react: 50_000, router: 10_000 }
      }
    }
    const comment = formatComment({
      report: rechunkedReport,
      budget: BUDGET,
      baseBudget: BUDGET,
      base: BASE,
      runUrl: undefined
    })

    expect(comment).toContain(
      '| `router` | ⚪\u00A0+10.0\u00A0kB | every route |'
    )
    expect(comment).toContain(
      '| `entry` | 🟢\u00A0−15.0\u00A0kB | every route |'
    )
    expect(comment).not.toContain('🔴')
    expect(toAgentData(comment)).toMatchObject({
      chunkChanges: [
        { chunk: 'entry', deltaBytes: -15_000, isRegression: false },
        { chunk: 'router', deltaBytes: 10_000, isRegression: false }
      ]
    })
  })

  it('should show a chunk Rolldown renamed as one row', () => {
    const renamedReport: BundleReport = {
      ...MAIN_REPORT,
      shell: {
        bytes: 150_000,
        chunks: { entry: 100_000, react: 300, createServerFn: 49_700 }
      }
    }
    const comment = formatComment({
      report: renamedReport,
      budget: BUDGET,
      baseBudget: BUDGET,
      base: BASE,
      runUrl: undefined
    })

    expect(comment).toContain(
      '| `react` → `createServerFn` | ⚪\u00A0renamed | every route |'
    )
    expect(comment).not.toContain('| `createServerFn` |')
    expect(toAgentData(comment)).toMatchObject({
      chunkChanges: [
        {
          chunk: 'createServerFn',
          renamedFrom: 'react',
          deltaBytes: 0,
          isRegression: false
        }
      ]
    })
  })

  it('should warn about growth that stays within budget', () => {
    const roomyBudget = {
      ...BUDGET,
      routeJs: { ...BUDGET.routeJs, '/memes/$memeId': 45 }
    }
    const comment = formatComment({
      report: GROWN_REPORT,
      budget: roomyBudget,
      baseBudget: roomyBudget,
      base: BASE,
      runUrl: undefined
    })

    expect(comment).toContain('### 📦 Startup JS · ⚠️ Heavier, within budget')
    expect(comment).toContain('> `/memes/$memeId` grows by +11.0\u00A0kB.')
  })

  it('should flag in red every budget raised against main', () => {
    const comment = formatComment({
      report: GROWN_REPORT,
      budget: {
        ...BUDGET,
        routeJs: { ...BUDGET.routeJs, '/memes/$memeId': 43 },
        firstViewCss: { '/': 35 }
      },
      baseBudget: BUDGET,
      base: BASE,
      runUrl: undefined
    })

    expect(comment).toContain('### 📦 Startup JS · 🔴 Budget raised')
    expect(comment).toContain(
      '> [!CAUTION]\n> 🔴 **`/memes/$memeId`** raises its route JS budget from 32\u00A0kB to 43\u00A0kB.\n> 🔴 **`/`** raises its first-view CSS budget from 33\u00A0kB to 35\u00A0kB.'
    )
    expect(comment).toContain(
      '| `/memes/$memeId` | 41.0\u00A0kB | 🔴\u00A0+11.0\u00A0kB | 🔴\u00A043\u00A0kB, was 32\u00A0kB · 2.0\u00A0kB left |'
    )
    expect(toAgentData(comment)).toMatchObject({
      verdict: 'raised',
      raisedBudgets: [
        {
          kind: 'routeJs',
          name: '/memes/$memeId',
          beforeKb: 32,
          afterKb: 43
        },
        { kind: 'firstViewCss', name: '/', beforeKb: 33, afterKb: 35 }
      ]
    })
  })

  it('should keep the distance to the goal in sight, red while far from it', () => {
    const comment = formatComment({
      report: GROWN_REPORT,
      budget: {
        ...BUDGET,
        goal: { startupJs: 60, routeJs: 16, firstViewCss: 20 }
      },
      baseBudget: BUDGET,
      base: BASE,
      runUrl: undefined
    })

    expect(comment).toContain(
      [
        '> [!CAUTION]',
        '> **Far from the goal.** 🟩 is the goal, each 🟥 one more goal’s worth.',
        '>',
        '> | | Now | Goal | Distance |',
        '> | --- | --: | --: | --- |',
        '> | Startup JS of `/memes/$memeId`, the heaviest route | 191.0\u00A0kB | 60\u00A0kB | 🟩🟥🟥🟥 3.2× |',
        '> | **Shell** (every route) | 150.0\u00A0kB | 60\u00A0kB | 🟩🟥🟥 2.5× |',
        '> | Route JS of `/memes/$memeId` | 41.0\u00A0kB | 16\u00A0kB | 🟩🟥🟥 2.6× |'
      ].join('\n')
    )
  })

  it('should turn the distance to the goal green once the site reaches it', () => {
    const comment = formatComment({
      report: MAIN_REPORT,
      budget: {
        ...BUDGET,
        goal: { startupJs: 200, routeJs: 50, firstViewCss: 20 }
      },
      baseBudget: BUDGET,
      base: BASE,
      runUrl: undefined
    })

    expect(comment).toContain('> [!TIP]\n> **Within the goal.**')
  })

  it('should say when nothing changed, and leave the prompt out', () => {
    const comment = formatComment({
      report: MAIN_REPORT,
      budget: BUDGET,
      baseBudget: BUDGET,
      base: BASE,
      runUrl: undefined
    })

    expect(comment).toContain('### 📦 Startup JS · ✅ No heavier')
    expect(comment).toContain('No route changed against main.')
    expect(comment).not.toContain('**Prompt**')
  })

  it('should explain the missing comparison before main has a report', () => {
    const comment = formatComment({
      report: MAIN_REPORT,
      budget: BUDGET,
      baseBudget: undefined,
      base: undefined,
      runUrl: undefined
    })

    expect(comment).toContain('### 📦 Startup JS · ✅ Within budget')
    expect(comment).toContain('> [!NOTE]')
    expect(comment).not.toContain('🆕')
    expect(comment).toContain('pnpm run bundle-size\npnpm run build:analyze')
  })
})
