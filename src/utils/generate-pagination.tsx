import React from 'react'
import { PaginationItem, PaginationLink } from '@/components/ui/pagination'
import type { LinkProps } from '@tanstack/react-router'

export const generatePaginationLinks = (
  currentPage: number,
  totalPages: number,
  getLinkProps: (page: number) => LinkProps
): React.JSX.Element[] => {
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
  let startPage = Math.max(1, currentPage - halfVisible)
  const endPage = Math.min(totalPages, startPage + maxVisible - 1)

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

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
