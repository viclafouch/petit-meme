import { describe, expect, it } from 'vitest'
import { resolveMemesSort } from '~/helpers/memes-sort'

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
})
