import { describe, expect, it } from 'vitest'
import { resolveLibraryFilters, resolveMemesSort } from '~/helpers/memes-sort'

describe('resolveMemesSort', () => {
  it('should sort a browsed library by trend', () => {
    expect(resolveMemesSort({})).toBe('trending')
  })

  it('should sort a searched library by relevance', () => {
    expect(resolveMemesSort({ query: 'chat' })).toBe('relevance')
  })

  it('should keep the sort the Visitor picked', () => {
    expect(resolveMemesSort({ sort: 'new', query: 'chat' })).toBe('new')
  })

  it('should rank a searched library by relevance rather than by trend', () => {
    expect(resolveMemesSort({ sort: 'trending', query: 'chat' })).toBe(
      'relevance'
    )
  })

  it('should fall back to the trend when relevance has nothing to rank', () => {
    expect(resolveMemesSort({ sort: 'relevance' })).toBe('trending')
  })

  it('should sort a browsed category by views, as it has no trend of its own', () => {
    expect(resolveMemesSort({ category: 'chats' })).toBe('popular')
  })

  it('should never sort a category by trend', () => {
    expect(resolveMemesSort({ sort: 'trending', category: 'chats' })).toBe(
      'popular'
    )
  })

  it('should keep the newest first in a category when asked', () => {
    expect(resolveMemesSort({ sort: 'new', category: 'chats' })).toBe('new')
  })
})

describe('resolveLibraryFilters', () => {
  it('should read the whole library as no category', () => {
    expect(resolveLibraryFilters({ slug: 'all' })).toStrictEqual({
      query: undefined,
      category: undefined,
      sort: 'trending'
    })
  })

  it('should filter on the category of the page', () => {
    expect(
      resolveLibraryFilters({ slug: 'chats', query: 'cookie' })
    ).toStrictEqual({ query: 'cookie', category: 'chats', sort: 'relevance' })
  })
})
