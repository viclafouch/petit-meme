import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import { generatePaginationLinks } from '@/utils/generate-pagination'
import type { LinkProps } from '@tanstack/react-router'

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
        {showPreviousNext && totalPages && currentPage - 1 >= 1 ? (
          <PaginationItem>
            <PaginationPrevious
              size="default"
              {...getLinkProps(currentPage - 1)}
            />
          </PaginationItem>
        ) : null}
        {generatePaginationLinks({ currentPage, totalPages, getLinkProps })}
        {showPreviousNext && totalPages && currentPage + 1 <= totalPages ? (
          <PaginationItem>
            <PaginationNext size="default" {...getLinkProps(currentPage + 1)} />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  )
}
