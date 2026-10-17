import { createFileRoute } from '@tanstack/react-router'
import { DownloaderPage } from '~/routes/admin/-components/downloader-page'

export const Route = createFileRoute('/admin/downloader')({
  component: DownloaderPage,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Téléchargeur' }] }
  },
  loader: async () => {
    return {
      crumb: 'Téléchargeur'
    }
  }
})
