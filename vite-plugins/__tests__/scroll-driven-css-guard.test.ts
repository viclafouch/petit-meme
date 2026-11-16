import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { findScrollDrivenBreakages } from '../scroll-driven-css-guard'

type LightningCss = {
  transform: (options: {
    filename: string
    code: Uint8Array
    minify: boolean
  }) => { code: Uint8Array }
}

const matchIsLightningCss = (value: unknown): value is LightningCss => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'transform' in value &&
    typeof value.transform === 'function'
  )
}

const loadLightningCss = (fromModule: string) => {
  const lightningcss: unknown = createRequire(fromModule)('lightningcss')

  if (!matchIsLightningCss(lightningcss)) {
    throw new Error(`No lightningcss next to ${fromModule}`)
  }

  return lightningcss
}

const TAILWIND_LIGHTNINGCSS = loadLightningCss(
  createRequire(import.meta.resolve('@tailwindcss/vite')).resolve(
    '@tailwindcss/node'
  )
)

const VITE_LIGHTNINGCSS = loadLightningCss(import.meta.resolve('vite'))

const BUG_REPRODUCTIONS = {
  'issues/1012':
    '.a{animation:r linear both,h linear both;animation-timeline:scroll(self block)}',
  'issues/1226':
    '.b{animation:x linear both;animation-timeline:view();animation-range:entry exit}'
}

const SHIPPED_SCROLL_DRIVEN_RULES = [
  '.meme-rail-list{animation:linear both a,linear both b;animation-duration:auto;animation-timeline:scroll(self);animation-range:0 var(--s),calc(100% - var(--s)) 100%}',
  '@media (width>=64rem){.navbar-scroll-fade{animation:linear both n;animation-timeline:scroll(root);animation-range:0 180px}}',
  '.platform-phone-reveal{animation:linear both p;animation-timeline:view();animation-range:entry 10% cover 45%}',
  '.scroll-fade-x{animation:1ms ease-in-out s,1ms ease-in-out e;animation-timeline:scroll(self inline),scroll(self inline)}',
  '.exit-phase{animation-timeline:view();animation-range:exit 0% exit 100%}',
  '.toast{animation-duration:0s}'
].join('')

describe('findScrollDrivenBreakages', () => {
  it('should flag a scroll-driven animation whose duration became 0s', () => {
    expect(
      findScrollDrivenBreakages(
        '.rail{animation-name:r,h;animation-duration:0s,0s;animation-timeline:scroll(self)}'
      )
    ).toStrictEqual([expect.stringMatching(/^\.rail: .+issues\/1012\)$/u)])
  })

  it('should flag a timeline folded into the animation shorthand', () => {
    expect(
      findScrollDrivenBreakages('.reveal{animation:linear both reveal view()}')
    ).toStrictEqual([expect.stringMatching(/^\.reveal: .+issues\/1283\)$/u)])
  })

  it('should flag a range end collapsed to the start of the exit phase', () => {
    expect(
      findScrollDrivenBreakages(
        '.card{animation-timeline:view();animation-range:entry exit 0%}'
      )
    ).toStrictEqual([expect.stringMatching(/^\.card: .+issues\/1226\)$/u)])
  })

  it('should pass the scroll-driven rules the site ships', () => {
    expect(
      findScrollDrivenBreakages(SHIPPED_SCROLL_DRIVEN_RULES)
    ).toStrictEqual([])
  })
})

describe.each([
  ['Tailwind', TAILWIND_LIGHTNINGCSS],
  ['Vite', VITE_LIGHTNINGCSS]
])('the lightningcss of %s', (_name, lightningcss) => {
  it.each(Object.entries(BUG_REPRODUCTIONS))(
    'should still have %s, or the guard entry can go',
    (issue, css) => {
      const { code } = lightningcss.transform({
        filename: 'reproduction.css',
        code: Buffer.from(css),
        minify: true
      })

      expect(
        findScrollDrivenBreakages(new TextDecoder().decode(code))
      ).toContainEqual(expect.stringContaining(issue))
    }
  )
})
