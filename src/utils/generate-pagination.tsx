import React from 'react'
import { PaginationItem, PaginationLink } from '@/components/ui/pagination'
import type { LinkProps } from '@tanstack/react-router'

type GeneratePaginationLinksParams = {
  currentPage: number
  totalPages: number
  getLinkProps: (page: number) => LinkProps
}

export const generatePaginationLinks = ({
  currentPage,
  totalPages,
  getLinkProps
}: GeneratePaginationLinksParams): React.JSX.Element[] => {
  const pages: React.JSX.Element[] = []
  const maxVisible = 6

  if (totalPages <= maxVisible) {
    for (let index = 1; index <= totalPages; index += 1) {
      pages.push(
        <PaginationItem key={index}>
          <PaginationLink
            isActive={index === currentPage}
            size="icon"
            {...getLinkProps(index)}
          >
            {index}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return pages
  }

  const halfVisible = Math.floor(maxVisible / 2)
  const rawStart = Math.max(1, currentPage - halfVisible)
  const endPage = Math.min(totalPages, rawStart + maxVisible - 1)
  const startPage =
    endPage - rawStart + 1 < maxVisible
      ? Math.max(1, endPage - maxVisible + 1)
      : rawStart

  for (let index = startPage; index <= endPage; index += 1) {
    pages.push(
      <PaginationItem key={index}>
        <PaginationLink
          {...getLinkProps(index)}
          size="icon"
          isActive={index === currentPage}
        >
          {index}
        </PaginationLink>
      </PaginationItem>
    )
  }

  return pages
}
