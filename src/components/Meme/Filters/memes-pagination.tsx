import React from 'react'
import { Paginator } from '@/components/paginator'

type MemesPaginationProps = {
  currentPage: number
  totalPages: number
  slug: string | undefined
}

const MemesPagination = ({
  currentPage,
  totalPages,
  slug
}: MemesPaginationProps) => {
  return (
    <Paginator
      currentPage={currentPage}
      totalPages={totalPages}
      getLinkProps={(page) => {
        if (slug) {
          return {
            to: '/memes/category/$slug',
            params: { slug },
            search: (prevState) => {
              return {
                page,
                query: prevState.query
              }
            }
          }
        }

        return {
          to: '/memes',
          search: (prevState) => {
            return {
              page,
              query: prevState.query
            }
          }
        }
      }}
      showPreviousNext
    />
  )
}

export default MemesPagination
