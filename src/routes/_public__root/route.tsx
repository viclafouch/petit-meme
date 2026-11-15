import { createFileRoute } from '@tanstack/react-router'
import { getAnnouncementDismissed } from '~/lib/announcement-banner'
import { getLocaleBannerDismissed } from '~/lib/locale-banner'
import { listMemesQueryOpts } from '~/queries/meme'
import { PublicLayout } from './-components/public-layout'

export const Route = createFileRoute('/_public__root')({
  loader: ({ context }) => {
    void Promise.allSettled([context.queryClient.query(listMemesQueryOpts({}))])

    return {
      _localeBannerDismissed: getLocaleBannerDismissed(),
      _announcementDismissed: getAnnouncementDismissed()
    }
  },
  component: PublicLayout
})
