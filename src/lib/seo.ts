import type { MemeWithCategories, MemeWithVideo } from '@/constants/meme'
import { buildVideoImageUrl } from '@/lib/bunny'
import type { AnyRouteMatch } from '@tanstack/react-router'

export const appProdUrl = 'https://petit-meme.io'

export const websiteOrigin =
  process.env.NODE_ENV === 'production' ? appProdUrl : 'http://localhost:3000'

export const buildUrl = (pathname: string) => {
  let url = websiteOrigin

  try {
    url = new URL(pathname, websiteOrigin).href
  } catch (error) {}

  return url
}

export const seo = ({
  title,
  description,
  keywords,
  image,
  isAdmin = false,
  pathname = '/'
}: {
  title: string
  description?: string
  image?: string
  keywords?: string
  isAdmin?: boolean
  pathname?: string
}) => {
  const titlePrefixed = isAdmin
    ? `Admin Petit Meme - ${title}`
    : `Petit Meme - ${title}`

  let url = websiteOrigin

  try {
    url = new URL(pathname, websiteOrigin).href
  } catch (error) {}

  const tags = [
    { title: titlePrefixed },
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    { name: 'author', content: 'Victor de la Fouchardière' },
    { name: 'twitter:title', content: titlePrefixed },
    { name: 'twitter:description', content: description },
    { name: 'twitter:creator', content: '@TrustedSheriff' },
    { name: 'twitter:site', content: '@TrustedSheriff' },
    { name: 'og:type', content: 'website' },
    { name: 'og:site_name', content: titlePrefixed },
    { name: 'og:title', content: titlePrefixed },
    { name: 'og:description', content: description },
    { name: 'og:url', content: url },
    { name: 'og:locale', content: 'fr_FR' },
    ...(image
      ? [
          { name: 'twitter:image', content: image },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'og:image', content: image }
        ]
      : [])
  ] satisfies AnyRouteMatch['meta']

  return tags
}

export const buildMemeSeo = (
  meme: MemeWithVideo & MemeWithCategories,
  overrideOptions: Partial<Parameters<typeof seo>[0]> = {}
) => {
  const categoryKeywords = meme.categories.flatMap((category) => {
    return category.category.keywords
  })

  return seo({
    title: `Meme de ${meme.title}`,
    description: `Découvrez, téléchargez et partagez ce mème de "${meme.title}" avec tous vos proches. Télécharger le mème vidéo gratuitement.`,
    keywords: [...meme.keywords, ...categoryKeywords].join(', '),
    image: buildVideoImageUrl(meme.video.bunnyId),
    ...overrideOptions
  })
}
