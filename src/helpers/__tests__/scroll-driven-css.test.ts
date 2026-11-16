import { describe, expect, it } from 'vitest'
import { findScrollDrivenBreakages } from '~/helpers/scroll-driven-css'

const findProblemIssues = (css: string) => {
  return findScrollDrivenBreakages(css).map(({ selector, problem }) => {
    return `${selector} ${/lightningcss#\d+/u.exec(problem)?.[0] ?? ''}`
  })
}

describe('findScrollDrivenBreakages', () => {
  it('should flag a scroll-driven animation whose duration became 0s', () => {
    expect(
      findProblemIssues(
        '.rail{animation-name:r,h;animation-duration:0s,0s;animation-fill-mode:both,both;animation-timeline:scroll(self)}'
      )
    ).toStrictEqual(['.rail lightningcss#1012'])
  })

  it('should flag a timeline folded into the animation shorthand', () => {
    expect(
      findProblemIssues('.reveal{animation:linear both reveal view()}')
    ).toStrictEqual(['.reveal lightningcss#1283'])
  })

  it('should flag a range collapsed to the start of the exit phase', () => {
    expect(
      findProblemIssues(
        '.card{animation:linear both x;animation-timeline:view();animation-range:entry exit 0%}'
      )
    ).toStrictEqual(['.card lightningcss#1226'])
  })

  it('should pass the scroll-driven rules the site ships', () => {
    expect(
      findScrollDrivenBreakages(
        [
          '.meme-rail-list{animation:linear both a,linear both b;animation-duration:auto;animation-timeline:scroll(self);animation-range:0 var(--s),calc(100% - var(--s)) 100%}',
          '@media (width>=64rem){.navbar-scroll-fade{animation:linear both n;animation-timeline:scroll(root);animation-range:0 180px}}',
          '.platform-phone-reveal{animation:linear both p;animation-timeline:view();animation-range:entry 10% cover 45%}',
          '.scroll-fade-x{animation:1ms ease-in-out s,1ms ease-in-out e;animation-timeline:scroll(self inline),scroll(self inline)}',
          '.exit-only{animation-timeline:view();animation-range:exit 0% exit 100%}',
          '.toast{animation-duration:0s}'
        ].join('')
      )
    ).toStrictEqual([])
  })
})
