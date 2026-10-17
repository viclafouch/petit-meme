import { createFileRoute } from '@tanstack/react-router'
import { MEMES_FILTERS_SCHEMA } from '~/constants/meme'
import { LibraryPage } from '~/routes/admin/library/-components/library-page'

export const Route = createFileRoute('/admin/library/')({
  component: LibraryPage,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Librairie' }] }
  },
  validateSearch: (search) => {
    return MEMES_FILTERS_SCHEMA.parse(search)
  },
  loader: () => {
    return {
      crumb: 'Librairie'
    }
  }
})
