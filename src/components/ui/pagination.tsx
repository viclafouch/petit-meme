/* eslint-disable */
import * as React from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon
} from 'lucide-react'
import type { Button } from '~/components/ui/button'
import { buttonVariants } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'
import type { LinkProps } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => {
  return (
    <nav
      role="navigation"
      aria-label={m.common_pagination()}
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

const PaginationContent = ({
  className,
  ...props
}: React.ComponentProps<'ul'>) => {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
}

const PaginationItem = ({ ...props }: React.ComponentProps<'li'>) => {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  className?: string
  size: React.ComponentProps<typeof Button>['size']
} & LinkProps

const PaginationLink = ({
  isActive,
  size,
  className,
  ...props
}: PaginationLinkProps) => {
  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size
        }),
        className
      )}
      {...props}
    />
  )
}

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => {
  return (
    <PaginationLink
      aria-label={m.common_previous_page()}
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">{m.common_previous()}</span>
    </PaginationLink>
  )
}

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => {
  return (
    <PaginationLink
      aria-label={m.common_next_page()}
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:block">{m.common_next()}</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">{m.common_more_pages()}</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
}
