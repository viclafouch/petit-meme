import { createIsomorphicFn } from '@tanstack/react-start'
import {
  buildBreadcrumbNode,
  type Crumb,
  serializeJsonLdGraph
} from '~/lib/seo/json-ld'

type RenderJsonLdScriptsParams = {
  loaderData?: {
    jsonLd?: string | null
  }
}

export const getBreadcrumbJsonLd = createIsomorphicFn()
  .server((crumbs: readonly Crumb[]) => {
    return serializeJsonLdGraph([buildBreadcrumbNode(crumbs)])
  })
  .client(() => {
    return null
  })

export const renderJsonLdScripts = ({
  loaderData
}: RenderJsonLdScriptsParams) => {
  if (!loaderData?.jsonLd) {
    return []
  }

  return [{ type: 'application/ld+json', children: loaderData.jsonLd }]
}
