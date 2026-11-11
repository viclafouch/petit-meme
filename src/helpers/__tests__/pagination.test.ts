import { describe, expect, it } from 'vitest'
import { buildVisiblePages } from '~/helpers/pagination'

const MAX_VISIBLE_PAGES = 8
const FEW_PAGES = 5
const MANY_PAGES = 20

const buildRange = (start: number, end: number) => {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    return start + index
  })
}

describe('buildVisiblePages', () => {
  it('should show every page when they all fit', () => {
    expect(
      buildVisiblePages({ currentPage: 2, totalPages: FEW_PAGES })
    ).toStrictEqual(buildRange(1, FEW_PAGES))
  })

  it('should keep a full window around the current page', () => {
    const currentPage = MANY_PAGES / 2
    const start = currentPage - MAX_VISIBLE_PAGES / 2

    expect(
      buildVisiblePages({ currentPage, totalPages: MANY_PAGES })
    ).toStrictEqual(buildRange(start, start + MAX_VISIBLE_PAGES - 1))
  })

  it('should keep a full window on the last page', () => {
    expect(
      buildVisiblePages({ currentPage: MANY_PAGES, totalPages: MANY_PAGES })
    ).toStrictEqual(buildRange(MANY_PAGES - MAX_VISIBLE_PAGES + 1, MANY_PAGES))
  })

  it('should show no page when there is none', () => {
    expect(buildVisiblePages({ currentPage: 1, totalPages: 0 })).toStrictEqual(
      []
    )
  })
})
