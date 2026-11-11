import type { LinkProps } from '@tanstack/react-router'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination'
import { buildVisiblePages } from '~/helpers/pagination'

export type PaginatorProps = {
  currentPage: number
  totalPages: number
  getLinkProps: (pageNumber: number) => LinkProps
  showPreviousNext: boolean
}

export const Paginator = ({
  currentPage,
  totalPages,
  getLinkProps,
  showPreviousNext
}: PaginatorProps) => {
  return (
    <Pagination>
      <PaginationContent>
        {showPreviousNext && totalPages > 0 && currentPage - 1 >= 1 ? (
          <PaginationItem>
            <PaginationPrevious
              size="default"
              {...getLinkProps(currentPage - 1)}
            />
          </PaginationItem>
        ) : null}
        {buildVisiblePages({ currentPage, totalPages }).map((page) => {
          return (
            <PaginationItem key={page}>
              <PaginationLink
                {...getLinkProps(page)}
                size="icon"
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        })}
        {showPreviousNext && totalPages > 0 && currentPage + 1 <= totalPages ? (
          <PaginationItem>
            <PaginationNext size="default" {...getLinkProps(currentPage + 1)} />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  )
}
