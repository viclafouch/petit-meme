import {
  CircleCheck,
  CircleX,
  ExternalLink,
  LoaderCircle,
  X
} from 'lucide-react'
import {
  MotionConfig,
  motion,
  type TargetAndTransition,
  type Transition
} from 'motion/react'
import { Link } from '@tanstack/react-router'
import { Progress } from '~/components/animate-ui/base/progress'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import type { MemeFullData } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { cn } from '~/lib/utils'
import {
  getPublishRunSteps,
  getPublishStepStatus,
  type PublishRunKind,
  type PublishStep,
  type PublishStepStatus
} from '~/routes/admin/library/-lib/publish-run'
import type { MemePublisherRun } from './use-meme-publisher'
import { usePacedPublishRun } from './use-paced-publish-run'

const STEP_LABELS = {
  preparing: 'Préparation de la vidéo',
  watermarking: 'Watermark du MP4',
  'extracting-mp3': 'Extraction du MP3',
  uploading: 'Envoi sur Bunny',
  saving: 'Mise en ligne'
} as const satisfies Record<PublishStep, string>

const STATUS_LABELS = {
  pending: 'à venir',
  active: 'en cours',
  done: 'terminé',
  failed: 'échec'
} as const satisfies Record<PublishStepStatus, string>

type RunSuccessMessage = {
  title: string
  description: string
}

const PUBLISHED_MESSAGE = {
  title: 'Meme publié',
  description: 'Il est en ligne avec son MP4 watermarké et son MP3.'
} as const satisfies RunSuccessMessage

const SUCCESS_MESSAGES = {
  publish: PUBLISHED_MESSAGE,
  'publish-with-files': PUBLISHED_MESSAGE,
  regenerate: {
    title: 'Fichiers régénérés',
    description: 'Le MP4 et le MP3 sont à jour sur Bunny.'
  }
} as const satisfies Record<PublishRunKind, RunSuccessMessage>

const NODE_POP_SCALE = 1.18
const HALO_SCALE = 1.7
const HALO_OPACITY = 0.5

const NODE_REST = { scale: 1 } as const satisfies TargetAndTransition
const NODE_POP = {
  scale: [1, NODE_POP_SCALE, 1]
} as const satisfies TargetAndTransition
const NODE_POP_TRANSITION = {
  duration: 0.35,
  ease: 'easeOut'
} as const satisfies Transition
const CHECK_TRANSITION = {
  duration: 0.3,
  ease: 'easeOut',
  delay: 0.05
} as const satisfies Transition
const HALO_ANIMATION = {
  scale: [1, HALO_SCALE],
  opacity: [HALO_OPACITY, 0]
} as const satisfies TargetAndTransition
const HALO_TRANSITION = {
  duration: 1.4,
  ease: 'easeOut',
  repeat: Infinity
} as const satisfies Transition
const THREAD_TRANSITION = {
  duration: 0.4,
  ease: 'easeInOut'
} as const satisfies Transition
const RESULT_INITIAL = {
  opacity: 0,
  y: 6
} as const satisfies TargetAndTransition
const RESULT_VISIBLE = {
  opacity: 1,
  y: 0
} as const satisfies TargetAndTransition
const RESULT_TRANSITION = {
  duration: 0.3,
  ease: 'easeOut',
  delay: 0.35
} as const satisfies Transition

type StepNodeProps = {
  status: PublishStepStatus
}

const StepNode = ({ status }: StepNodeProps) => {
  return (
    <motion.span
      aria-hidden
      initial={false}
      animate={status === 'done' ? NODE_POP : NODE_REST}
      transition={NODE_POP_TRANSITION}
      className={cn(
        'relative flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300',
        status === 'pending' && 'border-border bg-card',
        status === 'active' && 'border-info/60 bg-info/15 text-info',
        status === 'done' &&
          'border-success-foreground/40 bg-success text-success-foreground',
        status === 'failed' &&
          'border-destructive/60 bg-destructive/15 text-destructive'
      )}
    >
      {status === 'pending' ? (
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      ) : null}
      {status === 'active' ? (
        <>
          <motion.span
            className="absolute inset-0 rounded-full border border-info"
            animate={HALO_ANIMATION}
            transition={HALO_TRANSITION}
          />
          <LoaderCircle className="size-3.5 animate-spin" />
        </>
      ) : null}
      {status === 'done' ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={CHECK_TRANSITION}
          />
        </svg>
      ) : null}
      {status === 'failed' ? <X className="size-3.5" /> : null}
    </motion.span>
  )
}

type RunResultProps = {
  run: MemePublisherRun
  meme: MemeFullData
  onRetry: () => void
}

const RunResult = ({ run, meme, onRetry }: RunResultProps) => {
  if (run.outcome === 'failed') {
    return (
      <Alert variant="destructive">
        <CircleX aria-hidden />
        <AlertTitle>Échec : {STEP_LABELS[run.step]}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          {run.error}
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const message = SUCCESS_MESSAGES[run.kind]

  return (
    <Alert variant="success">
      <CircleCheck aria-hidden />
      <AlertTitle>{message.title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        {message.description}
        {meme.status === MemeStatus.PUBLISHED ? (
          <Button
            variant="link"
            className="h-auto p-0"
            nativeButton={false}
            render={<Link to="/memes/$memeId" params={{ memeId: meme.id }} />}
          >
            Voir sur le site
            <ExternalLink data-icon="inline-end" aria-hidden />
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

type MemePublishTimelineProps = {
  run: MemePublisherRun
  meme: MemeFullData
  onRetry: () => void
}

export const MemePublishTimeline = ({
  run,
  meme,
  onRetry
}: MemePublishTimelineProps) => {
  const pacedRun = usePacedPublishRun(run)
  const steps = getPublishRunSteps(pacedRun.kind)

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-4" aria-live="polite">
        <ol className="flex flex-col">
          {steps.map((step, index) => {
            const status = getPublishStepStatus(pacedRun, step)
            const isLast = index === steps.length - 1
            const isProgressVisible =
              status === 'active' &&
              pacedRun.step === run.step &&
              run.progress !== null

            return (
              <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
                {isLast ? null : (
                  <span
                    aria-hidden
                    className="absolute top-7 bottom-1 left-3 w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-border"
                  >
                    <motion.span
                      className="block size-full origin-top bg-success-foreground/70"
                      initial={false}
                      animate={{ scaleY: status === 'done' ? 1 : 0 }}
                      transition={THREAD_TRANSITION}
                    />
                  </span>
                )}
                <StepNode status={status} />
                <div className="relative min-w-0 flex-1">
                  <div className="flex h-6 items-center justify-between gap-2 text-sm">
                    <span
                      className={cn(
                        'transition-colors duration-300',
                        status === 'pending' && 'text-muted-foreground',
                        status === 'failed' && 'text-destructive'
                      )}
                    >
                      {STEP_LABELS[step]}
                      <span className="sr-only">
                        {`, ${STATUS_LABELS[status]}`}
                      </span>
                    </span>
                    {isProgressVisible ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {run.progress}%
                      </span>
                    ) : null}
                  </div>
                  {isProgressVisible ? (
                    <div className="absolute inset-x-0 top-8">
                      <Progress
                        value={run.progress}
                        aria-label={STEP_LABELS[step]}
                        className="h-1"
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
        {pacedRun.outcome === 'running' ? null : (
          <motion.div
            initial={RESULT_INITIAL}
            animate={RESULT_VISIBLE}
            transition={RESULT_TRANSITION}
          >
            <RunResult run={pacedRun} meme={meme} onRetry={onRetry} />
          </motion.div>
        )}
      </div>
    </MotionConfig>
  )
}
