import type { InstallGuideStep } from '~/components/install/install-guide'
import { cn } from '~/lib/utils'

type InstallGuideStepsProps = {
  steps: InstallGuideStep[]
  className?: string
}

export const InstallGuideSteps = ({
  steps,
  className
}: InstallGuideStepsProps) => {
  return (
    <ol className={cn('flex flex-col gap-3', className)}>
      {steps.map(({ Icon, text }, index) => {
        return (
          <li key={text} className="flex items-start gap-3 text-left">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums"
            >
              {index + 1}
            </span>
            <p className="flex-1 pt-0.5 text-sm leading-relaxed text-pretty">
              {text}
            </p>
            {Icon ? (
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-info"
              >
                <Icon className="size-5" />
              </span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
