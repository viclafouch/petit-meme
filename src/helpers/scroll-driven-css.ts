const RULE_PATTERN = /([^{}]+)\{([^{}]*)\}/gu
const ZERO_DURATION_PATTERN = /^0m?s$/u
const SHORTHAND_TIMELINE_PATTERN = /\b(?:scroll|view)\(/u
const COLLAPSED_EXIT_RANGE_PATTERN = /\S+\s+exit 0%$/u

type Declarations = Map<string, string>

type ScrollDrivenBreakage = {
  selector: string
  problem: string
}

const parseDeclarations = (block: string): Declarations => {
  const declarations: Declarations = new Map()

  for (const declaration of block.split(';')) {
    const separatorIndex = declaration.indexOf(':')

    if (separatorIndex > 0) {
      declarations.set(
        declaration.slice(0, separatorIndex).trim(),
        declaration.slice(separatorIndex + 1).trim()
      )
    }
  }

  return declarations
}

const listDeclarationProblems = (declarations: Declarations) => {
  const problems: string[] = []
  const duration = declarations.get('animation-duration')
  const shorthand = declarations.get('animation')
  const rangeItems = declarations.get('animation-range')?.split(',') ?? []

  if (
    declarations.has('animation-timeline') &&
    duration?.split(',').some((item) => {
      return ZERO_DURATION_PATTERN.test(item.trim())
    })
  ) {
    problems.push(
      'animation-duration became 0s, so the animation ends at once: write `animation-duration: auto` after the `animation` shorthand (lightningcss#1012)'
    )
  }

  if (shorthand && SHORTHAND_TIMELINE_PATTERN.test(shorthand)) {
    problems.push(
      'the timeline was folded into the `animation` shorthand, which browsers reject: keep `animation-timeline` as its own declaration (lightningcss#1283)'
    )
  }

  if (
    rangeItems.some((item) => {
      return COLLAPSED_EXIT_RANGE_PATTERN.test(item.trim())
    })
  ) {
    problems.push(
      'animation-range ends at `exit 0%`, the start of the exit phase: write each end with its range name and percentage, such as `cover 0% cover 100%` (lightningcss#1226)'
    )
  }

  return problems
}

export const findScrollDrivenBreakages = (css: string) => {
  const breakages: ScrollDrivenBreakage[] = []

  for (const [, selector = '', block = ''] of css.matchAll(RULE_PATTERN)) {
    for (const problem of listDeclarationProblems(parseDeclarations(block))) {
      breakages.push({ selector: selector.trim(), problem })
    }
  }

  return breakages
}
