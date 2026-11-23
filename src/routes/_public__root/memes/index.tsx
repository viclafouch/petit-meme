import { createFileRoute, redirect } from '@tanstack/react-router'
import { HTTP_STATUS } from '~/constants/http'
import { ALL_CATEGORY_SLUG, MEMES_SEARCH_SCHEMA } from '~/constants/meme'

export const Route = createFileRoute('/_public__root/memes/')({
  validateSearch: (search) => {
    return MEMES_SEARCH_SCHEMA.parse(search)
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/memes/category/$slug',
      params: { slug: ALL_CATEGORY_SLUG },
      search,
      replace: true,
      statusCode: HTTP_STATUS.PERMANENT_REDIRECT
    })
  }
})
