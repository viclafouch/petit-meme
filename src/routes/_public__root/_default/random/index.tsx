import { createFileRoute, redirect } from '@tanstack/react-router'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { getRandomMeme } from '~/server/meme/meme.functions'

export const Route = createFileRoute('/_public__root/_default/random/')({
  pendingMs: 1000,
  loader: async () => {
    const meme = await getRandomMeme({ data: {} })

    if (meme) {
      throw redirect({
        to: '/memes/$memeId',
        params: {
          memeId: meme.id
        },
        replace: true
      })
    }

    throw redirect({
      to: '/memes/category/$slug',
      params: { slug: ALL_CATEGORY_SLUG }
    })
  }
})
