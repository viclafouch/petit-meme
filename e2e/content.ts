import { MEMES_PER_PAGE } from '~/constants/meme'
import { DAY, THIRTY_DAYS_MS } from '~/constants/time'
import type {
  Category,
  CategoryTranslation,
  Meme,
  MemeTranslation,
  Video
} from '~/db/generated/prisma/client'
import { MemeContentLocale } from '~/db/generated/prisma/enums'
import type { Locale } from '~/paraglide/runtime'
import { E2E_VIDEO_BUNNY_ID } from './env'

export const E2E_VIDEO_DURATION = 6

export type E2eCategory = {
  id: Category['id']
  slug: Category['slug']
  title: Category['title']
  keywords: readonly string[]
  translations: readonly {
    locale: Locale
    title: CategoryTranslation['title']
    keywords: readonly string[]
  }[]
}

export type E2eMeme = {
  id: Meme['id']
  title: Meme['title']
  description: Meme['description']
  keywords: readonly string[]
  contentLocale: Meme['contentLocale']
  viewCount: Meme['viewCount']
  bunnyId: Video['bunnyId']
  publishedDaysAgo: number
  categorySlugs: readonly Category['slug'][]
  translations: readonly {
    locale: Locale
    title: MemeTranslation['title']
    description: MemeTranslation['description']
    keywords: readonly string[]
  }[]
}

export const E2E_CATEGORIES = {
  chats: {
    id: 'e2e-category-chats',
    slug: 'chats',
    title: 'Chats',
    keywords: ['chat', 'félin'],
    translations: [
      { locale: 'fr', title: 'Chats', keywords: ['chat', 'félin'] },
      { locale: 'en', title: 'Cats', keywords: ['cat', 'feline'] }
    ]
  },
  politique: {
    id: 'e2e-category-politique',
    slug: 'politique',
    title: 'Politique',
    keywords: ['politique', 'débat'],
    translations: [
      { locale: 'fr', title: 'Politique', keywords: ['politique', 'débat'] },
      { locale: 'en', title: 'Politics', keywords: ['politics', 'debate'] }
    ]
  }
} as const satisfies Record<string, E2eCategory>

// The word a search test looks for. It appears in one Meme and nowhere else,
// neither in the filler titles nor in the Category names.
export const E2E_SEARCH_WORD = 'ornithorynque'

// The Memes a test names. Their view counts are the highest of the set, so they
// all sit on the first page whatever the filler does.
//
// Only the most viewed one carries a Video that exists at Bunny. Everything
// else has a made up id, which is enough for a list, a thumbnail slot and a
// page, and never enough to play or to Export.
export const E2E_NAMED_MEMES = {
  mostViewed: {
    id: 'e2e-meme-most-viewed',
    title: 'Le chat qui veut un cookie',
    description: 'Il le veut vraiment.',
    keywords: ['chat', 'cookie'],
    contentLocale: MemeContentLocale.FR,
    viewCount: 9000,
    bunnyId: E2E_VIDEO_BUNNY_ID,
    publishedDaysAgo: 200,
    categorySlugs: ['chats'],
    translations: [
      {
        locale: 'fr',
        title: 'Le chat qui veut un cookie',
        description: 'Il le veut vraiment.',
        keywords: ['chat', 'cookie']
      }
    ]
  },
  searchTarget: {
    id: 'e2e-meme-search-target',
    title: `L'${E2E_SEARCH_WORD} perplexe`,
    description: 'Il ne comprend pas non plus.',
    keywords: [E2E_SEARCH_WORD],
    contentLocale: MemeContentLocale.FR,
    viewCount: 8000,
    bunnyId: 'e2e-video-search-target',
    publishedDaysAgo: 180,
    categorySlugs: [],
    translations: [
      {
        locale: 'fr',
        title: `L'${E2E_SEARCH_WORD} perplexe`,
        description: 'Il ne comprend pas non plus.',
        keywords: [E2E_SEARCH_WORD]
      }
    ]
  },
  english: {
    id: 'e2e-meme-english',
    title: 'The cat that steals bread',
    description: 'It steals the whole loaf.',
    keywords: ['cat', 'bread'],
    contentLocale: MemeContentLocale.EN,
    viewCount: 7000,
    bunnyId: 'e2e-video-english',
    publishedDaysAgo: 4,
    categorySlugs: ['chats'],
    translations: [
      {
        locale: 'en',
        title: 'The cat that steals bread',
        description: 'It steals the whole loaf.',
        keywords: ['cat', 'bread']
      }
    ]
  },
  universal: {
    id: 'e2e-meme-universal',
    title: 'Le lampadaire qui tombe',
    description: 'Aucune langue nécessaire.',
    keywords: ['lampadaire'],
    contentLocale: MemeContentLocale.UNIVERSAL,
    viewCount: 6000,
    bunnyId: 'e2e-video-universal',
    publishedDaysAgo: 2,
    categorySlugs: ['politique'],
    translations: [
      {
        locale: 'fr',
        title: 'Le lampadaire qui tombe',
        description: 'Aucune langue nécessaire.',
        keywords: ['lampadaire']
      },
      {
        locale: 'en',
        title: 'The falling street lamp',
        description: 'No language needed.',
        keywords: ['lamp']
      }
    ]
  },
  recentlyPublished: {
    id: 'e2e-meme-recently-published',
    title: 'Le débat interrompu par un pigeon',
    description: 'Le pigeon avait raison.',
    keywords: ['pigeon', 'débat'],
    contentLocale: MemeContentLocale.FR,
    viewCount: 5000,
    bunnyId: 'e2e-video-recently-published',
    publishedDaysAgo: 3,
    categorySlugs: ['politique'],
    translations: [
      {
        locale: 'fr',
        title: 'Le débat interrompu par un pigeon',
        description: 'Le pigeon avait raison.',
        keywords: ['pigeon', 'débat']
      }
    ]
  }
} as const satisfies Record<string, E2eMeme>

// The library shows thirty Memes per page, and both locales need a second page
// to walk to. Two fillers in three are Universal, because the English library
// only sees English and Universal: at this count it holds thirty four Memes,
// against fifty three for the French one.
const FILLER_MEME_COUNT = 48

const buildFillerMeme = (rank: number): E2eMeme => {
  const paddedRank = String(rank).padStart(2, '0')
  const isUniversal = rank % 3 !== 0
  const frenchTitle = `Meme de démonstration ${paddedRank}`
  const frenchDescription = `Meme semé pour la liste, rang ${rank}.`

  const frenchTranslation = {
    locale: 'fr',
    title: frenchTitle,
    description: frenchDescription,
    keywords: ['démonstration']
  } as const satisfies E2eMeme['translations'][number]

  const englishTranslation = {
    locale: 'en',
    title: `Demonstration meme ${paddedRank}`,
    description: `Meme seeded for the library, rank ${rank}.`,
    keywords: ['demonstration']
  } as const satisfies E2eMeme['translations'][number]

  return {
    id: `e2e-meme-filler-${paddedRank}`,
    title: frenchTitle,
    description: frenchDescription,
    keywords: ['démonstration'],
    contentLocale: isUniversal
      ? MemeContentLocale.UNIVERSAL
      : MemeContentLocale.FR,
    viewCount: 3000 - rank * 10,
    bunnyId: `e2e-video-filler-${paddedRank}`,
    publishedDaysAgo: 60 + rank,
    categorySlugs: [],
    translations: isUniversal
      ? [frenchTranslation, englishTranslation]
      : [frenchTranslation]
  }
}

export const E2E_FILLER_MEMES = Array.from(
  { length: FILLER_MEME_COUNT },
  (_, index) => {
    return buildFillerMeme(index + 1)
  }
)

export const E2E_MEMES: readonly E2eMeme[] = [
  ...Object.values(E2E_NAMED_MEMES),
  ...E2E_FILLER_MEMES
]

// The news Category and the home announcement read the same window, so the
// Memes that fall inside it are counted once, from the window the app itself
// declares. Three in French, and no fixture sits near the edge.
const NEWS_WINDOW_IN_DAYS = THIRTY_DAYS_MS / DAY

export const E2E_RECENT_MEMES = E2E_MEMES.filter((meme) => {
  return meme.publishedDaysAgo < NEWS_WINDOW_IN_DAYS
})

// The first page of `trending` falls back to the view counts when no Event
// exists, so the thirty highest sit on it and the rest sit behind it. This is
// what the distinct view counts above are for.
const MEMES_BY_VIEW_COUNT = E2E_MEMES.toSorted((first, second) => {
  return second.viewCount - first.viewCount
})

export const E2E_FIRST_PAGE_MEMES = MEMES_BY_VIEW_COUNT.slice(0, MEMES_PER_PAGE)
export const E2E_SECOND_PAGE_MEMES = MEMES_BY_VIEW_COUNT.slice(MEMES_PER_PAGE)
