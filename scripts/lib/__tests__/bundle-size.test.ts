import { describe, expect, it } from 'vitest'
import {
  buildBudget,
  type BundleBudget,
  checkBudget,
  listLooseBudgetLines,
  listRaisedBudgets,
  listStartupHrefs,
  measureBundle,
  toChunkName
} from '../bundle-size'

const SIZE_BY_HREF = new Map(
  Object.entries({
    '/assets/entry-AAAAAAAA.js': 100_000,
    '/assets/react-BBBBBBBB.js': 50_000,
    '/assets/public-layout-CCCCCCCC.js': 10_000,
    '/assets/meme-DDDDDDDD.js': 20_000,
    '/assets/studio-EEEEEEEE.js': 30_000,
    '/assets/card-FFFFFFFF.js': 5000,
    '/assets/settings-GGGGGGGG.js': 7000,
    '/assets/admin-layout-HHHHHHHH.js': 8000,
    '/assets/admin-index-IIIIIIII.js': 4000
  })
)

const ROUTES = {
  __root__: {
    preloads: ['/assets/entry-AAAAAAAA.js', '/assets/react-BBBBBBBB.js'],
    scripts: [{ attrs: { src: '/assets/entry-AAAAAAAA.js' } }]
  },
  '/_public__root': { preloads: ['/assets/public-layout-CCCCCCCC.js'] },
  '/_public__root/memes/$memeId': {
    preloads: ['/assets/meme-DDDDDDDD.js', '/assets/card-FFFFFFFF.js']
  },
  '/_public__root/memes/$memeId/studio': {
    preloads: ['/assets/studio-EEEEEEEE.js', '/assets/card-FFFFFFFF.js']
  },
  '/_public__root/_default/settings/': {
    preloads: ['/assets/settings-GGGGGGGG.js', '/assets/react-BBBBBBBB.js']
  },
  '/admin': { preloads: ['/assets/admin-layout-HHHHHHHH.js'] },
  '/admin/': { preloads: ['/assets/admin-index-IIIIIIII.js'] }
}

const sizeOf = (href: string) => {
  const size = SIZE_BY_HREF.get(href)

  if (size === undefined) {
    throw new Error(`Unknown asset ${href}`)
  }

  return size
}

const REPORT = measureBundle({
  startupHrefs: listStartupHrefs(ROUTES),
  sizeOf
})

const BUDGET: BundleBudget = {
  goal: { startupJs: 150, routeJs: 50, firstViewCss: 20 },
  shellJs: 152,
  routeJs: {
    '/memes/$memeId': 37,
    '/memes/$memeId/studio': 67,
    '/settings': 19,
    '/admin': 14
  },
  firstViewCss: { '/': 33 }
}

describe('toChunkName', () => {
  it('should drop the Rolldown hash', () => {
    expect(toChunkName('/assets/meme-card-GTTlQrUU.js')).toBe('meme-card')
    expect(toChunkName('/assets/_memeId.studio-B1OVxS7X.js')).toBe(
      '_memeId.studio'
    )
  })
})

describe('listStartupHrefs', () => {
  it('should key pages by URL path, and leave out pathless and index-owning layouts', () => {
    expect(
      Object.keys(listStartupHrefs(ROUTES).routes).toSorted()
    ).toStrictEqual([
      '/admin',
      '/memes/$memeId',
      '/memes/$memeId/studio',
      '/settings'
    ])
  })

  it('should include a layout the manifest pruned from the children lists, and leave the shell out', () => {
    expect(listStartupHrefs(ROUTES).routes['/settings']).toStrictEqual([
      '/assets/public-layout-CCCCCCCC.js',
      '/assets/settings-GGGGGGGG.js'
    ])
  })

  it('should fail loudly without a root route', () => {
    expect(() => {
      return listStartupHrefs({})
    }).toThrow('The TanStack Start manifest has no root route')
  })
})

describe('measureBundle', () => {
  it('should count each file once, and size it by chunk name', () => {
    expect(REPORT.shell).toStrictEqual({
      bytes: 150_000,
      chunks: { entry: 100_000, react: 50_000 }
    })
    expect(REPORT.routes['/memes/$memeId/studio']).toStrictEqual({
      bytes: 65_000,
      chunks: {
        'public-layout': 10_000,
        meme: 20_000,
        card: 5000,
        studio: 30_000
      }
    })
  })
})

describe('checkBudget', () => {
  it('should pass a report within its budget', () => {
    expect(checkBudget({ report: REPORT, budget: BUDGET })).toStrictEqual([])
  })

  it('should report a line over budget, a route without one, and a stale one', () => {
    const grownReport = {
      shell: { bytes: 153_000, chunks: {} },
      routes: {
        ...REPORT.routes,
        '/reels': { bytes: 9000, chunks: {} },
        '/settings': { bytes: 19_001, chunks: {} }
      }
    }

    expect(
      checkBudget({
        report: grownReport,
        budget: { ...BUDGET, routeJs: { ...BUDGET.routeJs, '/gone': 10 } }
      })
    ).toStrictEqual([
      { kind: 'over', name: 'Shell', bytes: 153_000, budgetKb: 152 },
      { kind: 'over', name: '/settings', bytes: 19_001, budgetKb: 19 },
      { kind: 'missing', name: '/reels', bytes: 9000 },
      { kind: 'stale', name: '/gone', budgetKb: 10 }
    ])
  })
})

describe('buildBudget', () => {
  it('should round each size up and add the headroom, keeping the goal and the CSS budgets', () => {
    expect(
      buildBudget({
        report: {
          shell: { bytes: 140_200, chunks: {} },
          routes: { '/reels': { bytes: 9000, chunks: {} } }
        },
        budget: BUDGET,
        allowGrowth: false
      })
    ).toStrictEqual({ ...BUDGET, shellJs: 143, routeJs: { '/reels': 11 } })
  })

  it('should keep a budget the measured size would raise, unless growth is allowed', () => {
    const grownReport = {
      shell: { bytes: 160_000, chunks: {} },
      routes: { '/settings': { bytes: 18_500, chunks: {} } }
    }

    expect(
      buildBudget({ report: grownReport, budget: BUDGET, allowGrowth: false })
    ).toStrictEqual({ ...BUDGET, shellJs: 152, routeJs: { '/settings': 19 } })
    expect(
      buildBudget({ report: grownReport, budget: BUDGET, allowGrowth: true })
    ).toStrictEqual({ ...BUDGET, shellJs: 162, routeJs: { '/settings': 21 } })
  })
})

describe('listRaisedBudgets', () => {
  it('should list every budget above the one on main, CSS included', () => {
    expect(
      listRaisedBudgets({
        budget: {
          ...BUDGET,
          shellJs: 160,
          routeJs: { ...BUDGET.routeJs, '/settings': 18, '/reels': 30 },
          firstViewCss: { '/': 40 }
        },
        baseBudget: BUDGET
      })
    ).toStrictEqual([
      { kind: 'shellJs', name: 'Shell', beforeKb: 152, afterKb: 160 },
      { kind: 'firstViewCss', name: '/', beforeKb: 33, afterKb: 40 }
    ])
  })
})

describe('listLooseBudgetLines', () => {
  it('should list the budgets above the size plus the headroom', () => {
    const looseLines = listLooseBudgetLines({
      report: REPORT,
      budget: { ...BUDGET, routeJs: { ...BUDGET.routeJs, '/admin': 20 } }
    })

    expect(
      looseLines.map((line) => {
        return line.name
      })
    ).toStrictEqual(['/admin'])
  })
})
