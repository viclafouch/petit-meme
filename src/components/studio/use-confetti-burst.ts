import React from 'react'
import type { ExportCompletion } from '~/components/studio/use-studio-export'
import type { MemeExportMode } from '~/constants/meme'

const CONFETTI_COLORS = [
  'var(--color-brand-green)',
  'var(--color-brand-cyan)',
  'var(--color-brand-violet)',
  '#ffffff',
  'var(--color-brand-green-light)',
  'var(--color-brand-violet-light)'
]
const CONFETTI_COUNT = 28
const CONFETTI_SPREAD_DEG = 150
const CONFETTI_UPWARD_DEG = -90
const HALF = 0.5
const CONFETTI_MIN_DISTANCE_PX = 90
const CONFETTI_EXTRA_DISTANCE_PX = 90
const CONFETTI_DRIFT_RATIO = 1.15
const CONFETTI_FALL_PX = 70
const CONFETTI_PEAK_SPIN_RATIO = 0.6
const CONFETTI_MIN_DURATION_MS = 820
const CONFETTI_EXTRA_DURATION_MS = 260
const CONFETTI_MAX_SPIN_DEG = 720
const HALF_TURN_DEG = 180
const DEGREES_TO_RADIANS = Math.PI / HALF_TURN_DEG
const FALLBACK_COLOR = '#ffffff'

const findVisibleExportButton = (
  actions: HTMLElement,
  mode: MemeExportMode
) => {
  return [
    ...actions.querySelectorAll<HTMLElement>(`[data-export-mode="${mode}"]`)
  ].find((button) => {
    return button.getClientRects().length > 0
  })
}

const launchPiece = (layer: HTMLElement, origin: DOMRect, index: number) => {
  const piece = document.createElement('span')
  piece.className = 'studio-confetti'
  piece.style.background =
    CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? FALLBACK_COLOR
  piece.style.left = `${origin.left + origin.width * HALF}px`
  piece.style.top = `${origin.top + origin.height * HALF}px`
  layer.append(piece)

  const spread = index / (CONFETTI_COUNT - 1) - HALF
  const angle =
    (CONFETTI_UPWARD_DEG + spread * CONFETTI_SPREAD_DEG) * DEGREES_TO_RADIANS
  const distance =
    CONFETTI_MIN_DISTANCE_PX + Math.random() * CONFETTI_EXTRA_DISTANCE_PX
  const x = Math.cos(angle) * distance
  const y = Math.sin(angle) * distance
  const spin = (Math.random() - HALF) * CONFETTI_MAX_SPIN_DEG

  return piece.animate(
    [
      {
        transform: 'translate(-50%, -50%) rotate(0deg) scale(0.6)',
        opacity: 1
      },
      {
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${spin * CONFETTI_PEAK_SPIN_RATIO}deg) scale(1)`,
        opacity: 1,
        offset: 0.5
      },
      { opacity: 1, offset: 0.75 },
      {
        transform: `translate(calc(-50% + ${x * CONFETTI_DRIFT_RATIO}px), calc(-50% + ${y + CONFETTI_FALL_PX}px)) rotate(${spin}deg) scale(0.9)`,
        opacity: 0
      }
    ],
    {
      duration:
        CONFETTI_MIN_DURATION_MS + Math.random() * CONFETTI_EXTRA_DURATION_MS,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      fill: 'forwards'
    }
  )
}

const burstConfetti = (origin: DOMRect, host: HTMLElement) => {
  const layer = document.createElement('div')
  layer.className = 'studio-confetti-layer'
  host.append(layer)

  const animations = Array.from({ length: CONFETTI_COUNT }, (_, index) => {
    return launchPiece(layer, origin, index)
  })

  const removeWhenLanded = async () => {
    await Promise.allSettled(
      animations.map((animation) => {
        return animation.finished
      })
    )
    layer.remove()
  }

  void removeWhenLanded()

  return () => {
    layer.remove()
  }
}

export const useConfettiBurst = (completion: ExportCompletion | null) => {
  const actionsRef = React.useRef<HTMLDivElement>(null)
  const burstId = completion?.isVisible ? completion.id : null
  const mode = completion?.mode ?? null

  React.useEffect(() => {
    const actions = actionsRef.current

    if (
      burstId === null ||
      mode === null ||
      actions === null ||
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return () => {}
    }

    const button = findVisibleExportButton(actions, mode)

    if (button === undefined) {
      return () => {}
    }

    return burstConfetti(
      button.getBoundingClientRect(),
      actions.closest('dialog') ?? document.body
    )
  }, [burstId, mode])

  return actionsRef
}
