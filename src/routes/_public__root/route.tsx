import { createFileRoute } from '@tanstack/react-router'
import { getLocaleBannerDismissed } from '~/lib/locale-banner'
import { listMemesQueryOpts } from '~/queries/meme'
import { PublicLayout } from './-components/public-layout'

export const Route = createFileRoute('/_public__root')({
  loader: ({ context }) => {
    void Promise.allSettled([context.queryClient.query(listMemesQueryOpts({}))])

    return {
      _localeBannerDismissed: getLocaleBannerDismissed()
    }
  },
  component: PublicLayout
})
