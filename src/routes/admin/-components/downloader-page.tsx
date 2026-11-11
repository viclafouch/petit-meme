import { DownloadFromTwitterForm } from '~/routes/admin/-components/download-from-twitter-form'
import { PageHeader } from '~/routes/admin/-components/page-header'

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
