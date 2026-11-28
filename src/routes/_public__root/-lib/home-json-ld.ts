import type { Organization, WebSite } from 'schema-dts'
import { createIsomorphicFn } from '@tanstack/react-start'
import {
  ORGANIZATION_ID,
  SITE_IDENTITY,
  SITE_LOGO_URL,
  serializeJsonLdGraph
} from '~/lib/seo/json-ld'
import { websiteOrigin } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'

export const buildWebsiteNode = (): WebSite => {
  return {
    '@type': 'WebSite',
    '@id': `${websiteOrigin}/#website`,
    ...SITE_IDENTITY,
    publisher: { '@id': ORGANIZATION_ID }
  }
}

export const buildOrganizationNode = (): Organization => {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    ...SITE_IDENTITY,
    logo: SITE_LOGO_URL,
    description: m.seo_home_description()
  }
}

export const getHomeJsonLd = createIsomorphicFn()
  .server(() => {
    return serializeJsonLdGraph([buildWebsiteNode(), buildOrganizationNode()])
  })
  .client(() => {
    return null
  })
