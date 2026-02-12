import { DownloadFromTwitterForm } from '@/components/admin/download-from-twitter-form'
import { PageHeader } from '@/components/page-header'
import { createFileRoute } from '@tanstack/react-router'

const RouteComponent = () => {
  return (
    <div>
      <PageHeader title="Téléchargeur" />
      <div className="py-10">
        <DownloadFromTwitterForm />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/admin/downloader')({
  component: RouteComponent,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Téléchargeur' }] }
  },
  loader: async () => {
    return {
      crumb: 'Téléchargeur'
    }
  }
})
