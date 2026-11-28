import type React from 'react'
import { cn } from '~/lib/utils'

type HomeShowcaseSectionProps = {
  headingId: string
  title: string
  lead: string
  glowClassName: string
  visual: React.ReactNode
  children: React.ReactNode
  isVisualFirst?: boolean
}

export const HomeShowcaseSection = ({
  headingId,
  title,
  lead,
  glowClassName,
  visual,
  isVisualFirst = false,
  children
}: HomeShowcaseSectionProps) => {
  return (
    <section
      aria-labelledby={headingId}
      className="relative isolate grid min-h-[calc(100svh-var(--navbar-space)-var(--tab-bar-space))] items-center gap-14 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20 lg:py-12"
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -inset-x-4 inset-y-0 -z-10',
          glowClassName
        )}
      />
      <div
        className={cn(
          'flex flex-col items-start gap-6',
          isVisualFirst && 'order-last'
        )}
      >
        <h2
          id={headingId}
          className="font-bricolage text-4xl leading-display font-bold tracking-tight text-balance sm:text-5xl xl:text-6xl"
        >
          {title}
        </h2>
        <p className="max-w-[48ch] text-lg text-muted-foreground text-pretty">
          {lead}
        </p>
        {children}
      </div>
      {visual}
    </section>
  )
}
