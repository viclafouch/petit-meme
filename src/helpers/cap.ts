export const FREE_CAPS = {
  bookmark: 20,
  generation: 3,
  aiSearch: 3
} as const satisfies Record<string, number>

export type CapKind = keyof typeof FREE_CAPS

type BuildCapStateParams = {
  kind: CapKind
  usedCount: number
  isPremium: boolean
}

export const buildCapState = ({
  kind,
  usedCount,
  isPremium
}: BuildCapStateParams) => {
  if (isPremium) {
    return { isPremium, isReached: false, remaining: null }
  }

  const remaining = Math.max(0, FREE_CAPS[kind] - usedCount)

  return { isPremium, isReached: remaining === 0, remaining }
}

export const buildReachedCapState = (kind: CapKind) => {
  return buildCapState({ kind, usedCount: FREE_CAPS[kind], isPremium: false })
}
