import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { ServicesGrid } from './-components/services/services-grid'

const RouteComponent = () => {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title="Services" />
      <ServicesGrid />
    </div>
  )
}

export const Route = createFileRoute('/admin/services')({
  component: RouteComponent,
  head: () => {
    return {
      meta: [{ title: 'Services — Admin' }]
    }
  }
})
