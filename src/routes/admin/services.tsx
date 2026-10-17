import { createFileRoute } from '@tanstack/react-router'
import { ServicesPage } from './-components/services/services-page'

export const Route = createFileRoute('/admin/services')({
  component: ServicesPage,
  head: () => {
    return {
      meta: [{ title: 'Services — Admin' }]
    }
  }
})
