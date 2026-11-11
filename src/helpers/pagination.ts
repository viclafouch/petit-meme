const MAX_VISIBLE_PAGES = 8

type BuildVisiblePagesParams = {
  currentPage: number
  totalPages: number
}

export const buildVisiblePages = ({
  currentPage,
  totalPages
}: BuildVisiblePagesParams) => {
  const rawStart = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2))
  const endPage = Math.min(totalPages, rawStart + MAX_VISIBLE_PAGES - 1)
  const startPage =
    endPage - rawStart + 1 < MAX_VISIBLE_PAGES
      ? Math.max(1, endPage - MAX_VISIBLE_PAGES + 1)
      : rawStart

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => {
    return startPage + index
  })
}
