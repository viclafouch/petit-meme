import { PageHeader } from '~/components/page-header'
import { ServicesGrid } from './services-grid'

export const ServicesPage = () => {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title="Services" />
      <ServicesGrid />
    </div>
  )
}
