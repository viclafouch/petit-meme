import { CircleCheck, CircleX, ExternalLink } from 'lucide-react'
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
import { StepNode } from './step-node'
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
