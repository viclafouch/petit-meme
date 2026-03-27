import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { m } from '~/paraglide/messages.js'
import { ProfileContent } from './-components/profile-content'
import { ProfileHeader } from './-components/profile-header'

const RouteComponent = () => {
  const { user, activeSubscription } = useRouteContext({
    from: '/_public__root/_default/settings/'
  })

  return (
    <div className="mx-auto flex flex-col gap-6">
      <ProfileHeader user={user} activeSubscription={activeSubscription} />
      <ProfileContent user={user} activeSubscription={activeSubscription} />
    </div>
  )
}

export const Route = createFileRoute('/_public__root/_default/settings/')({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        { title: m.settings_page_title() },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
