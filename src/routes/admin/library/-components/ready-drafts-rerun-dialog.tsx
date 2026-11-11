import React from 'react'
import { LoaderCircle, Sparkles } from 'lucide-react'
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Transition
} from 'motion/react'
import NumberFlow from '@number-flow/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { cn } from '~/lib/utils'
import { getReadyMemeDraftsQueryOpts } from '~/routes/admin/-lib/queries'
import type { PublishStepStatus } from '~/routes/admin/library/-lib/publish-run'
import {
  matchIsRerunStepSettled,
  type RerunDraftStep
} from '~/routes/admin/library/-lib/ready-drafts-rerun'
import { StepNode } from './step-node'
import {
  type ReadyDraft,
  type ReadyDraftsRerun,
  type ReadyDraftsRerunDraft,
  useReadyDraftsRerun
} from './use-ready-drafts-rerun'

type StepMeta = {
  node: PublishStepStatus
  label: string
  segmentClassName: string
  captionClassName: string
}

const STEP_META = {
  queued: {
    node: 'pending',
    label: 'En file',
    segmentClassName: 'bg-muted',
    captionClassName: 'text-muted-foreground'
  },
  starting: {
    node: 'active',
    label: 'Lancement',
    segmentClassName: 'bg-info/40 motion-safe:animate-pulse',
    captionClassName: 'text-muted-foreground'
  },
  running: {
    node: 'active',
    label: 'L’IA regarde la vidéo',
    segmentClassName: 'bg-info/60 motion-safe:animate-pulse',
    captionClassName: 'text-muted-foreground'
  },
  rewritten: {
    node: 'done',
    label: 'Réécrit',
    segmentClassName: 'bg-success',
    captionClassName: 'text-muted-foreground'
  },
  proposed: {
    node: 'done',
    label: 'Proposition à relire',
    segmentClassName: 'bg-info',
    captionClassName: 'text-info'
  },
  failed: {
    node: 'failed',
    label: 'Échec',
    segmentClassName: 'bg-destructive',
    captionClassName: 'text-destructive'
  }
} as const satisfies Record<RerunDraftStep, StepMeta>

const RERUN_RULE =
  'Les brouillons intacts sont réécrits. Ceux que vous avez modifiés reçoivent une proposition.'

const TITLE_SWAP_TRANSITION = {
  duration: 0.35,
  ease: 'easeOut'
} as const satisfies Transition

const pluralize = (count: number, singular: string, plural: string) => {
  return `${count} ${count === 1 ? singular : plural}`
}

const countStep = (
  drafts: ReadyDraftsRerunDraft[],
  ...steps: RerunDraftStep[]
) => {
  return drafts.filter(({ step }) => {
    return steps.includes(step)
  }).length
}

const buildRerunSummary = (drafts: ReadyDraftsRerunDraft[]) => {
  const parts = [
    {
      count: countStep(drafts, 'starting', 'running'),
      label: (count: number) => {
        return `${count} en cours`
      }
    },
    {
      count: countStep(drafts, 'rewritten'),
      label: (count: number) => {
        return pluralize(count, 'réécrit', 'réécrits')
      }
    },
    {
      count: countStep(drafts, 'proposed'),
      label: (count: number) => {
        return pluralize(count, 'proposition', 'propositions')
      }
    },
    {
      count: countStep(drafts, 'failed'),
      label: (count: number) => {
        return pluralize(count, 'échec', 'échecs')
      }
    },
    {
      count: countStep(drafts, 'queued'),
      label: (count: number) => {
        return `${count} en file`
      }
    }
  ]

  return parts
    .filter(({ count }) => {
      return count > 0
    })
    .map(({ count, label }) => {
      return label(count)
    })
    .join(', ')
}

type RerunStripProps = {
  drafts: ReadyDraftsRerunDraft[]
}

const RerunStrip = ({ drafts }: RerunStripProps) => {
  return (
    <div aria-hidden className="flex h-2.5 gap-1">
      {drafts.map((draft) => {
        return (
          <span
            key={draft.id}
            className={cn(
              'min-w-1 flex-1 rounded-full transition-colors duration-500',
              STEP_META[draft.step].segmentClassName
            )}
          />
        )
      })}
    </div>
  )
}

type RerunDraftRowProps = {
  draft: ReadyDraftsRerunDraft
}

const RerunDraftRow = ({ draft }: RerunDraftRowProps) => {
  const isRetitled =
    draft.step === 'rewritten' && draft.title !== draft.previousTitle
  const isSettled = matchIsRerunStepSettled(draft.step)

  return (
    <li className="flex items-start gap-3 py-2.5">
      <StepNode status={STEP_META[draft.step].node} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={draft.title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={TITLE_SWAP_TRANSITION}
            className={cn(
              'truncate font-medium',
              draft.step === 'queued' && 'text-muted-foreground'
            )}
          >
            {draft.title}
          </motion.span>
        </AnimatePresence>
        <span
          className={cn(
            'truncate text-xs',
            STEP_META[draft.step].captionClassName
          )}
        >
          {STEP_META[draft.step].label}
          {draft.reason ? ` : ${draft.reason}` : null}
          {isRetitled ? `, avant « ${draft.previousTitle} »` : null}
        </span>
      </div>
      {isSettled ? (
        <Button
          variant="link"
          size="sm"
          className="h-6 shrink-0 px-0"
          nativeButton={false}
          render={
            <Link to="/admin/library/$memeId" params={{ memeId: draft.id }} />
          }
        >
          Relire
        </Button>
      ) : null}
    </li>
  )
}

type RerunProgressProps = {
  rerun: ReadyDraftsRerun
  onRestart: () => void
}

const RerunProgress = ({ rerun, onRestart }: RerunProgressProps) => {
  const { drafts, settledCount, isRunning } = rerun

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Relance de l’IA sur{' '}
          {pluralize(drafts.length, 'brouillon', 'brouillons')}
        </DialogTitle>
        <DialogDescription>{RERUN_RULE}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <p
          className="flex items-baseline gap-2 text-muted-foreground"
          aria-live="polite"
        >
          <NumberFlow
            value={settledCount}
            className="text-4xl font-semibold text-foreground tabular-nums"
          />
          <span>sur {drafts.length} terminés</span>
        </p>
        <RerunStrip drafts={drafts} />
        <p className="text-xs text-muted-foreground">
          {buildRerunSummary(drafts)}
        </p>
      </div>
      <ol className="-my-2.5 max-h-dvh-45 divide-y divide-border overflow-y-auto">
        {drafts.map((draft) => {
          return <RerunDraftRow key={draft.id} draft={draft} />
        })}
      </ol>
      <DialogFooter className="items-center sm:justify-between">
        {isRunning ? (
          <p className="text-xs text-muted-foreground">
            L’IA continue si vous fermez.
          </p>
        ) : (
          <Button type="button" variant="outline" onClick={onRestart}>
            Nouvelle relance
          </Button>
        )}
      </DialogFooter>
    </>
  )
}

type RerunConfirmProps = {
  onConfirm: ReadyDraftsRerun['start']
}

const RerunConfirm = ({ onConfirm }: RerunConfirmProps) => {
  const readyDraftsQuery = useQuery(getReadyMemeDraftsQueryOpts())
  const readyDrafts = readyDraftsQuery.data ?? []

  return (
    <>
      <DialogHeader>
        <DialogTitle>Relancer l’IA sur les brouillons prêts</DialogTitle>
        <DialogDescription>
          L’IA regarde à nouveau chaque vidéo avec le prompt actuel.{' '}
          {RERUN_RULE}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          type="button"
          disabled={readyDrafts.length === 0}
          onClick={() => {
            onConfirm(readyDrafts)
          }}
        >
          {readyDraftsQuery.isPending ? (
            <LoaderCircle
              data-icon="inline-start"
              className="animate-spin"
              aria-hidden
            />
          ) : (
            <Sparkles data-icon="inline-start" aria-hidden />
          )}
          {readyDraftsQuery.isPending
            ? 'Recherche des brouillons...'
            : `Relancer ${pluralize(readyDrafts.length, 'brouillon', 'brouillons')}`}
        </Button>
      </DialogFooter>
    </>
  )
}

export const ReadyDraftsRerunButton = () => {
  const rerun = useReadyDraftsRerun()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isConfirming, setIsConfirming] = React.useState(false)
  const hasRun = rerun.drafts.length > 0
  const isConfirmVisible = !hasRun || (isConfirming && !rerun.isRunning)

  const handleOpenChange = (isNextOpen: boolean) => {
    setIsOpen(isNextOpen)
    setIsConfirming(false)
  }

  const handleConfirm = (readyDrafts: ReadyDraft[]) => {
    setIsConfirming(false)
    rerun.start(readyDrafts)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          handleOpenChange(true)
        }}
      >
        {rerun.isRunning ? (
          <LoaderCircle
            data-icon="inline-start"
            className="animate-spin"
            aria-hidden
          />
        ) : (
          <Sparkles data-icon="inline-start" aria-hidden />
        )}
        {rerun.isRunning ? 'Voir la relance' : 'Relancer l’IA'}
        {rerun.isRunning ? (
          <Badge variant="info" size="sm" className="tabular-nums">
            {rerun.settledCount}/{rerun.drafts.length}
          </Badge>
        ) : null}
      </Button>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <MotionConfig reducedMotion="user">
            {isConfirmVisible ? (
              <RerunConfirm onConfirm={handleConfirm} />
            ) : (
              <RerunProgress
                rerun={rerun}
                onRestart={() => {
                  setIsConfirming(true)
                }}
              />
            )}
          </MotionConfig>
        </DialogContent>
      </Dialog>
    </>
  )
}
