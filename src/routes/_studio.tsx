import { createFileRoute } from '@tanstack/react-router'
import { StudioLayout } from './-components/studio-layout'

export const Route = createFileRoute('/_studio')({
  component: StudioLayout
})
