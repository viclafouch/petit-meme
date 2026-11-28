import type { BreadcrumbList, Graph, ListItem } from 'schema-dts'
import { LOGO_PATH, SITE_NAME } from '~/constants/branding'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { serializeJsonLd } from '~/helpers/json-ld'
import { buildUrl, websiteOrigin } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

export const ORGANIZATION_ID = `${websiteOrigin}/#organization`

export const SITE_IDENTITY = {
  name: SITE_NAME,
  alternateName: 'Petit Mème',
  url: `${websiteOrigin}/`
} as const

export const SITE_LOGO_URL = `${websiteOrigin}${LOGO_PATH}`

export type Crumb = {
  name: string
  pathname: string
}

type CrumbCategory = {
  slug: string
  title: string
}

export const serializeJsonLdGraph = (nodes: Graph['@graph']) => {
  return serializeJsonLd({ '@context': 'https://schema.org', '@graph': nodes })
}

export const buildCategoryCrumb = (category?: CrumbCategory): Crumb => {
  return {
    name: category?.title ?? m.meme_all_memes(),
    pathname: `/memes/category/${category?.slug ?? ALL_CATEGORY_SLUG}`
  }
}

export const buildBreadcrumbNode = (
  crumbs: readonly Crumb[]
): BreadcrumbList => {
  const locale = getLocale()
  const trail = [{ name: m.meme_breadcrumb_home(), pathname: '/' }, ...crumbs]

  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index): ListItem => {
      const isCurrentPage = index === trail.length - 1

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        ...(isCurrentPage ? {} : { item: buildUrl(crumb.pathname, locale) })
      }
    })
  }
}
