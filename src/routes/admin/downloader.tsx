import { createFileRoute } from '@tanstack/react-router'
import { DownloaderPage } from '~/routes/admin/-components/downloader-page'

export const Route = createFileRoute('/admin/downloader')({
  component: DownloaderPage,
  loader: async () => {
    return {
      crumb: 'Téléchargeur'
    }
  },
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Téléchargeur' }] }
  }
})
