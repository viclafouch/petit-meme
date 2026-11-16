import { useLocation } from '@tanstack/react-router'
import type { listRelatedMemes } from '~/server/meme/meme-list.functions'
import type { getMeme } from '~/server/meme/meme.functions'

type WatchedMeme = Awaited<ReturnType<typeof getMeme>>
type RelatedMeme = Awaited<ReturnType<typeof listRelatedMemes>>[number]

export const BREAK_UI_DATASETS = ['demo', 'worst', 'empty', 'one'] as const

export type BreakUiDataset = (typeof BREAK_UI_DATASETS)[number]

export const IS_BREAK_UI_ENABLED = import.meta.env.DEV

export const useBreakUiDataset = (): BreakUiDataset => {
  const dataset = useLocation({
    select: (location) => {
      return new URLSearchParams(location.searchStr).get('data')
    }
  })

  if (!IS_BREAK_UI_ENABLED) {
    return 'demo'
  }

  return (
    BREAK_UI_DATASETS.find((key) => {
      return key === dataset
    }) ?? 'demo'
  )
}

const WORST_TITLE =
  'Quand ton pote te dit « juste une petite question » sur ton code à 23h - Les Inconnus, La Télé'

const WORST_DESCRIPTION =
  "Un développeur reçoit un message de son pote à 23h qui commence par « juste une petite question » et finit en appel de trois heures, partage d'écran, captures floues et café froid #devlife #bug"

const WORST_KEYWORDS = [
  'quandtuoubliesdeprendretesclesavantdepartirdechez',
  'réaction',
  'les inconnus',
  'https://example.com/video/9f8e7d6c5b4a',
  'Benachrichtigungseinstellungen',
  'ça marche sur ma machine',
  'développeur',
  'appel',
  '23h',
  'pote',
  'question',
  'code',
  'stress',
  'nuit',
  'café',
  'écran',
  'bug',
  'prod',
  'vendredi',
  'déploiement'
]

const WORST_CATEGORY_TITLES = [
  'Réactions de célébrités françaises à la télévision des années 90',
  'Politique',
  'Chats',
  'Sport et commentateurs qui perdent leurs moyens en direct',
  'Cinéma',
  'Séries',
  'Animaux',
  'Musique',
  'Internet',
  'Jeux vidéo'
]

const WORST_RELATED = [
  {
    title: WORST_TITLE,
    categoryTitle: WORST_CATEGORY_TITLES[0],
    viewCount: 1_284_567,
    duration: 3599,
    width: 1179,
    height: 2556
  },
  {
    title: 'Ok',
    categoryTitle: 'Chats',
    viewCount: 0,
    duration: 1,
    width: 1920,
    height: 696
  },
  {
    title:
      'Benachrichtigungseinstellungensindkaputt_IMG_20250914_183022_HDR.mp4',
    categoryTitle: 'quandtuoubliesdeprendretesclesavantdepartir',
    viewCount: 1,
    duration: 59,
    width: 1080,
    height: 1080
  },
  {
    title: 'Đặng Thị Ngọc Hân réagit 😭😭😭 #fyp',
    categoryTitle: undefined,
    viewCount: 1284,
    duration: 12,
    width: null,
    height: null
  }
] as const

const buildCategories = (meme: WatchedMeme, titles: readonly string[]) => {
  const [template] = meme.categories

  if (!template) {
    return []
  }

  return titles.map((title, index) => {
    return {
      ...template,
      categoryId: `break-ui-category-${index}`,
      category: {
        ...template.category,
        id: `break-ui-category-${index}`,
        slug: `break-ui-category-${index}`,
        title
      }
    }
  })
}

export const applyBreakUiMeme = (
  meme: WatchedMeme,
  dataset: BreakUiDataset
): WatchedMeme => {
  if (dataset === 'worst') {
    return {
      ...meme,
      title: WORST_TITLE,
      description: WORST_DESCRIPTION,
      keywords: WORST_KEYWORDS,
      viewCount: 1_284_567,
      publishedAt: new Date('2019-03-01T10:00:00.000Z'),
      contentLocale: 'EN',
      video: { ...meme.video, width: 1179, height: 2556, duration: 3599 },
      categories: buildCategories(meme, WORST_CATEGORY_TITLES)
    }
  }

  if (dataset === 'empty') {
    return {
      ...meme,
      title: 'Ok',
      description: '',
      keywords: [],
      viewCount: 0,
      publishedAt: null,
      contentLocale: 'UNIVERSAL',
      video: { ...meme.video, width: null, height: null },
      categories: []
    }
  }

  if (dataset === 'one') {
    return {
      ...meme,
      description: 'Un.',
      keywords: ['un'],
      viewCount: 1,
      publishedAt: new Date(),
      video: { ...meme.video, width: 1920, height: 696, duration: 1 },
      categories: buildCategories(meme, ['Un'])
    }
  }

  return meme
}

export const applyBreakUiRelatedMemes = (
  relatedMemes: RelatedMeme[],
  dataset: BreakUiDataset
): RelatedMeme[] => {
  const [template] = relatedMemes

  if (dataset === 'empty' || !template) {
    return dataset === 'empty' ? [] : relatedMemes
  }

  if (dataset === 'one') {
    return [{ ...template, viewCount: 1 }]
  }

  if (dataset === 'worst') {
    return WORST_RELATED.map((related, index) => {
      return {
        ...template,
        id: `break-ui-related-${index}`,
        objectID: `break-ui-related-${index}`,
        title: related.title,
        viewCount: related.viewCount,
        categoryTitles: related.categoryTitle ? [related.categoryTitle] : [],
        categorySlugs: related.categoryTitle ? [`break-ui-${index}`] : [],
        video: {
          ...template.video,
          duration: related.duration,
          width: related.width,
          height: related.height
        }
      }
    })
  }

  return relatedMemes
}
