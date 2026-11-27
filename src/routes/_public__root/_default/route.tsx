import { createFileRoute } from '@tanstack/react-router'
import { DefaultLayout } from './-components/default-layout'

export const Route = createFileRoute('/_public__root/_default')({
  component: DefaultLayout
})
