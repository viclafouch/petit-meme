import React from 'react'
import { Download, Share } from 'lucide-react'
import type { Studio } from '~/components/studio/use-studio'
import type { MemeExportMode } from '~/constants/meme'
import { m } from '~/paraglide/messages'

const CATCH_UP_RATE = 0.08
const MIN_STEP_PER_FRAME = 0.004
const FINISH_STEP_PER_FRAME = 0.06
const HOLD_BELOW_DONE = 0.99
const PERCENT = 100

type CatchUpProgressProps = {
  target: number
  hasLabel: boolean
}

const CatchUpProgress = ({ target, hasLabel }: CatchUpProgressProps) => {
  const ringRef = React.useRef<HTMLSpanElement>(null)
  const labelRef = React.useRef<HTMLSpanElement>(null)
  const targetRef = React.useRef(target)

  React.useEffect(() => {
    targetRef.current = target
  }, [target])

  React.useEffect(() => {
    let shown = 0
    let frame = 0

    const paint = () => {
      const goal = targetRef.current
      const isDone = goal >= 1
      const ceiling = isDone ? 1 : Math.min(goal, HOLD_BELOW_DONE)
      const step = isDone
        ? FINISH_STEP_PER_FRAME
        : Math.max(MIN_STEP_PER_FRAME, (ceiling - shown) * CATCH_UP_RATE)

      shown = Math.min(ceiling, shown + step)
      ringRef.current?.style.setProperty('--progress', String(shown))

      if (labelRef.current !== null) {
        labelRef.current.textContent = `${Math.floor(shown * PERCENT)} %`
      }

      if (shown < 1) {
        frame = requestAnimationFrame(paint)
      }
    }

    frame = requestAnimationFrame(paint)

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <span ref={ringRef} className="studio-progress-ring" aria-hidden="true" />
      {hasLabel ? (
        <span ref={labelRef} className="tabular-nums">
          0 %
        </span>
      ) : null}
    </>
  )
}

const EXPORT_ICONS = {
  share: Share,
  download: Download
} as const satisfies Record<MemeExportMode, React.ElementType>

type ExportButtonProps = {
  studio: Studio
  mode: MemeExportMode
  className: string
  isCompact?: boolean
}

const ExportButton = ({
  studio,
  mode,
  className,
  isCompact = false
}: ExportButtonProps) => {
  const { exporter, render } = studio
  const isPending = exporter.pendingMode === mode
  const isDisabled =
    render.status === 'idle' ||
    render.status === 'unsupported' ||
    exporter.pendingMode !== null
  const Icon = EXPORT_ICONS[mode]

  const getLabel = () => {
    if (isPending) {
      return mode === 'share'
        ? m.studio_preparing_share()
        : m.studio_preparing_download()
    }

    if (mode === 'download') {
      return m.meme_download()
    }

    return exporter.isShareAwaitingTap ? m.studio_share_now() : m.meme_share()
  }

  const isLabelHidden = isCompact || isPending

  return (
    <button
      type="button"
      className={className}
      disabled={isDisabled}
      aria-label={isLabelHidden ? getLabel() : undefined}
      aria-busy={isPending || undefined}
      onClick={mode === 'share' ? exporter.share : exporter.download}
    >
      {isPending ? (
        <CatchUpProgress
          target={
            exporter.isCompleting || render.status === 'ready'
              ? 1
              : render.overallProgress
          }
          hasLabel={!isCompact}
        />
      ) : (
        <Icon className="size-[1.125rem]" aria-hidden="true" />
      )}
      {isLabelHidden ? null : getLabel()}
    </button>
  )
}

type ExportActionsProps = {
  studio: Studio
}

export const ExportActions = ({ studio }: ExportActionsProps) => {
  return (
    <div className="studio-editor-actions studio-hide-while-typing">
      <div className="studio-export-row">
        <ExportButton
          studio={studio}
          mode="share"
          className="studio-gradient-button studio-export-touch"
        />
        <ExportButton
          studio={studio}
          mode="download"
          className="studio-soft-button studio-export-touch studio-export-icon"
          isCompact
        />
        <ExportButton
          studio={studio}
          mode="download"
          className="studio-gradient-button studio-export-pointer"
        />
      </div>
    </div>
  )
}

type RenderIssueProps = {
  studio: Studio
}

export const RenderIssue = ({ studio }: RenderIssueProps) => {
  if (studio.render.status !== 'unsupported') {
    return null
  }

  return (
    <p className="studio-render-issue" role="alert">
      <span className="studio-render-issue-dot" aria-hidden="true" />
      {m.studio_unsupported()}
    </p>
  )
}
