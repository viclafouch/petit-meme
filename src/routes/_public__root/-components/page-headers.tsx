import React from 'react'
import { cn } from '~/lib/utils'

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
} & React.ComponentPropsWithRef<'div'>

export const PageHeader = ({
  className,
  children,
  as: Component = 'section',
  ...props
}: PageHeaderProps) => {
  return (
    <Component
      className={cn('relative flex flex-col items-center gap-6', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

type PageHeadingProps = React.HTMLAttributes<HTMLHeadingElement>

export const PageHeading = ({
  className,
  children,
  ...props
}: PageHeadingProps) => {
  return (
    <h1
      className={cn(
        'font-bricolage text-foreground max-w-4xl text-center text-4xl leading-display font-semibold text-balance sm:text-5xl lg:text-6xl mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

type PageDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

export const PageDescription = ({
  className,
  children,
  ...props
}: PageDescriptionProps) => {
  return (
    <p
      className={cn(
        'text-muted-foreground max-w-2xl text-center font-medium text-balance md:text-lg lg:text-xl mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}

type PageActionsProps = React.HTMLAttributes<HTMLDivElement>

export const PageActions = ({
  className,
  children,
  ...props
}: PageActionsProps) => {
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
