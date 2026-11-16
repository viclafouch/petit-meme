import type { Plugin } from 'vite'

/**
 * Why this plugin exists
 *
 * Lightning CSS rewrites scroll-driven animations wrongly, and only at build
 * time: dev serves the source CSS, so the bug shows in production only. It
 * runs twice on our CSS, in Tailwind's build pass (the lightningcss version
 * pinned by @tailwindcss/node) and in Vite's CSS minifier. The rewrite happens
 * with or without `minify`, so swapping Vite's minifier does not avoid it.
 *
 * It first broke the related Memes rail on the Meme page: its two-animation
 * fade came out with `animation-duration: 0s`, so the top fade showed before
 * any scroll (fixed in meme-page.css with `animation-duration: auto`).
 *
 * Upstream issues, all open on 2026-11-16 (lightningcss 1.32.0 and 1.33.0):
 * - https://github.com/parcel-bundler/lightningcss/issues/1012
 * - https://github.com/parcel-bundler/lightningcss/issues/1283
 * - https://github.com/parcel-bundler/lightningcss/issues/1226
 * Spec: `animation-duration` defaults to `auto`, and a time on a
 * scroll-driven animation is treated as `auto`:
 * https://drafts.csswg.org/css-animations-2/#propdef-animation-duration
 *
 * Still needed? The canary test in __tests__ replays each bug on the
 * lightningcss versions installed today. When a case fails, that bug is fixed
 * upstream: delete its entry below, and this whole plugin once none is left.
 */
const SCROLL_DRIVEN_BREAKAGES = [
  {
    issue: 'https://github.com/parcel-bundler/lightningcss/issues/1012',
    matches: (block: string) => {
      return (
        block.includes('animation-timeline') &&
        /animation-duration:\s*0s\b/u.test(block)
      )
    },
    fix: 'animation-duration became 0s, so the animation ends at once: write `animation-duration: auto` after the `animation` shorthand'
  },
  {
    issue: 'https://github.com/parcel-bundler/lightningcss/issues/1283',
    matches: (block: string) => {
      return /(?:^|[;\s])animation:[^;}]*\b(?:scroll|view)\(/u.test(block)
    },
    fix: 'the timeline was folded into the `animation` shorthand, which browsers reject: keep `animation-timeline` as its own declaration'
  },
  {
    issue: 'https://github.com/parcel-bundler/lightningcss/issues/1226',
    matches: (block: string) => {
      return /animation-range:[^;}]*[a-z] exit 0%/u.test(block)
    },
    fix: 'animation-range ends at `exit 0%`, the start of the exit phase: write each end with its range name and percentage, such as `cover 0% cover 100%`'
  }
]

export const findScrollDrivenBreakages = (css: string) => {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].flatMap(
    ([, selector = '', block = '']) => {
      return SCROLL_DRIVEN_BREAKAGES.filter(({ matches }) => {
        return matches(block)
      }).map(({ issue, fix }) => {
        return `${selector.trim()}: ${fix} (${issue})`
      })
    }
  )
}

export const scrollDrivenCssGuard = (): Plugin => {
  return {
    name: 'petit-meme:scroll-driven-css-guard',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const breakages = Object.values(bundle).flatMap((output) => {
        return output.type === 'asset' && output.fileName.endsWith('.css')
          ? findScrollDrivenBreakages(String(output.source)).map((breakage) => {
              return `${output.fileName} ${breakage}`
            })
          : []
      })

      if (breakages.length > 0) {
        this.error(
          `Lightning CSS broke a scroll-driven animation:\n${breakages.join('\n')}`
        )
      }
    }
  }
}
