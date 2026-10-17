import { createFileRoute } from '@tanstack/react-router'
import { getLocaleBannerDismissed } from '~/lib/locale-banner'
import { getMemesListQueryOpts } from '~/lib/queries'
import { PublicLayout } from './-components/public-layout'

export const Route = createFileRoute('/_public__root')({
  loader: ({ context }) => {
    void Promise.allSettled([
      context.queryClient.query(getMemesListQueryOpts({}))
    ])

    return {
      _localeBannerDismissed: getLocaleBannerDismissed()
    }
  },
  component: PublicLayout
})
