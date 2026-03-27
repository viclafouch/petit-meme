import { createFileRoute, redirect } from '@tanstack/react-router'
import { MEMES_SEARCH_SCHEMA } from '~/constants/meme'

export const Route = createFileRoute('/_public__root/_default/memes/')({
  validateSearch: (search) => {
    return MEMES_SEARCH_SCHEMA.parse(search)
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/memes/category/$slug',
      params: { slug: 'all' },
      search,
      replace: true,
      statusCode: 301
    })
  }
})
