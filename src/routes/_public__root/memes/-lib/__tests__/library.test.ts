import { describe, expect, it } from 'vitest'
import { MEMES_PER_PAGE } from '~/constants/meme'
import { CategoryFamily } from '~/db/generated/prisma/enums'
import {
  buildFakeCategory,
  buildFakeMeme
} from '~/routes/_public__root/memes/-lib/__tests__/library-fakes'
import {
  buildLibraryDescription,
  flattenUniqueCards,
  groupByFamily
} from '~/routes/_public__root/memes/-lib/library'

const buildPage = (page: number, memeIds: string[]) => {
  return {
    memes: memeIds.map((memeId) => {
      return buildFakeMeme(memeId)
    }),
    queryID: `query-${page}`,
    page,
    total: 100,
    hasNextPage: true
  }
}

describe('groupByFamily', () => {
  it('should list the families in their order, each sorted by Meme count', () => {
    const groups = groupByFamily([
      buildFakeCategory({
        slug: 'sources',
        family: CategoryFamily.SOURCE,
        memeCount: 4
      }),
      buildFakeCategory({
        slug: 'sad',
        family: CategoryFamily.MOOD,
        memeCount: 2
      }),
      buildFakeCategory({
        slug: 'happy',
        family: CategoryFamily.MOOD,
        memeCount: 9
      })
    ])

    expect(
      groups.map((group) => {
        return [
          group.id,
          group.categories.map((category) => {
            return category.slug
          })
        ]
      })
    ).toStrictEqual([
      [CategoryFamily.MOOD, ['happy', 'sad']],
      [CategoryFamily.SOURCE, ['sources']]
    ])
  })

  it('should gather the categories without a family last', () => {
    const groups = groupByFamily([
      buildFakeCategory({ slug: 'loose', family: null, memeCount: 50 }),
      buildFakeCategory({
        slug: 'reply',
        family: CategoryFamily.REPLY,
        memeCount: 1
      })
    ])

    expect(
      groups.map((group) => {
        return group.id
      })
    ).toStrictEqual([CategoryFamily.REPLY, 'OTHER'])
  })

  it('should leave out a family without any category', () => {
    expect(groupByFamily([])).toStrictEqual([])
  })
})

describe('flattenUniqueCards', () => {
  it('should number each card from its page', () => {
    const cards = flattenUniqueCards([buildPage(2, ['first', 'second'])])

    expect(
      cards.map((card) => {
        return card.position
      })
    ).toStrictEqual([MEMES_PER_PAGE + 1, MEMES_PER_PAGE + 2])
  })

  it('should keep a Meme once when two pages return it', () => {
    const cards = flattenUniqueCards([
      buildPage(1, ['first', 'shared']),
      buildPage(2, ['shared', 'third'])
    ])

    expect(
      cards.map((card) => {
        return [card.meme.id, card.queryID]
      })
    ).toStrictEqual([
      ['first', 'query-1'],
      ['shared', 'query-1'],
      ['third', 'query-2']
    ])
  })
})

describe('buildLibraryDescription', () => {
  it('should name the count and the first Memes of a category', () => {
    expect(
      buildLibraryDescription({
        categoryTitle: 'Rire',
        count: 42,
        exampleTitles: ['Le chat', 'Le pigeon', 'Le lampadaire', 'Le débat'],
        locale: 'fr'
      })
    ).toBe(
      '42 mèmes Rire en vidéo, dont « Le chat », « Le pigeon » et « Le lampadaire ». À regarder, télécharger et partager gratuitement, sans compte.'
    )
  })

  it('should speak of a single Meme in the singular', () => {
    expect(
      buildLibraryDescription({
        categoryTitle: 'Happy',
        count: 1,
        exampleTitles: ['The cat'],
        locale: 'en'
      })
    ).toBe(
      '1 Happy video meme: “The cat”. Watch, download and share it for free, no account needed.'
    )
  })

  it('should describe the whole library without a category', () => {
    expect(
      buildLibraryDescription({
        categoryTitle: undefined,
        count: 2,
        exampleTitles: ['The cat', 'The pigeon'],
        locale: 'en'
      })
    ).toBe(
      '2 video memes, including “The cat” and “The pigeon”. Watch, download and share them for free, no account needed.'
    )
  })

  it('should fall back to the category wording when it holds no Meme', () => {
    expect(
      buildLibraryDescription({
        categoryTitle: 'Rire',
        count: 0,
        exampleTitles: [],
        locale: 'fr'
      })
    ).toBe(
      'Mèmes Rire en vidéo à regarder, télécharger et partager gratuitement sur Petit Meme, sans compte.'
    )
  })
})
