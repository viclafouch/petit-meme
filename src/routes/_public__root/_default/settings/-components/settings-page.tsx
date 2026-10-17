import { useRouteContext } from '@tanstack/react-router'
import { ProfileContent } from './profile-content'
import { ProfileHeader } from './profile-header'

export const SettingsPage = () => {
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
