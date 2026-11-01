import type { RenderInput } from 'takumi-js'
import {
  HTTP_STATUS,
  IMMUTABLE_CACHE_CONTROL,
  NO_STORE_CACHE_CONTROL
} from '~/constants/http'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '~/constants/og'
import { captureWithFeature } from '~/lib/sentry'

type RenderOgImageParams = {
  template: RenderInput
  fontUrls: string[]
}

const OG_IMAGE_FETCH_CACHE = new Map<string, Promise<ArrayBuffer>>()

export const renderOgImage = async ({
  template,
  fontUrls
}: RenderOgImageParams) => {
  const { default: ImageResponse } = await import('takumi-js/response')

  const response = new ImageResponse(template, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    images: { fetchCache: OG_IMAGE_FETCH_CACHE },
    fonts: fontUrls,
    headers: { 'Cache-Control': IMMUTABLE_CACHE_CONTROL },
    onError: (error) => {
      captureWithFeature(error, 'og-image')
    }
  })

  try {
    await response.ready

    return response
  } catch {
    return new Response('Failed to render the OG image', {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers: { 'Cache-Control': NO_STORE_CACHE_CONTROL }
    })
  }
}
