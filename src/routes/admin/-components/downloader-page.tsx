import { PageHeader } from '~/components/page-header'
import { DownloadFromTwitterForm } from '~/routes/admin/-components/download-from-twitter-form'

export const DownloaderPage = () => {
  return (
    <div>
      <PageHeader title="Téléchargeur" />
      <div className="py-10">
        <DownloadFromTwitterForm />
      </div>
    </div>
  )
}
