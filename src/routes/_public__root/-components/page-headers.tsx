import React from 'react'
import { cn } from '@/lib/utils'
import type { LinkOptions } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

type PageContainerProps = {
  as?: React.ElementType
} & React.HTMLAttributes<HTMLDivElement>

export const PageContainer = ({
  className,
  children,
  as: Component = 'div',
  ...props
}: PageContainerProps) => {
  return (
    <Component
      className={cn('relative flex flex-1 flex-col gap-16', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

type PageHeaderProps = {
  as?: React.ElementType
} & React.HTMLAttributes<HTMLDivElement>

export const PageHeader = ({
  className,
  children,
  as: Component = 'section',
  ...props
}: PageHeaderProps) => {
  return (
    <Component
      className={cn(
        'relative container flex flex-col items-center gap-6',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

export const PageHeading = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h1
      className={cn(
        'font-bricolage text-foreground max-w-4xl text-center text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export const PageHeading2 = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h2
      className={cn(
        'font-bricolage text-foreground max-w-4xl text-center text-2xl leading-[1.1] font-semibold text-balance sm:text-3xl lg:text-4xl mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export const PageDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(
        'text-muted-foreground max-w-2xl text-center font-medium text-balance md:text-lg lg:text-xl mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
})

PageDescription.displayName = 'PageDescription'

export const PageActions = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-4 sm:flex-row',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type AnnouncementProps = {
  className?: string
  linkOptions: LinkOptions
  text: string
  actionText?: string
}

export const Announcement = ({
  className,
  linkOptions,
  text,
  actionText
}: AnnouncementProps) => {
  return (
    <Link
      {...linkOptions}
      className={cn(
        'bg-muted/50 border-border focus-ring relative flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold',
        className
      )}
    >
      <div className="relative size-2">
        <div className="bg-foreground size-2 rounded-full" />
        <div className="bg-foreground absolute inset-0 size-2 animate-ping rounded-full" />
      </div>
      <p>
        {text}{' '}
        {actionText ? (
          <strong className="ml-1 font-bold">{actionText}</strong>
        ) : null}
      </p>
    </Link>
  )
}
