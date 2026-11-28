import { Crown } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { m } from '~/paraglide/messages'

export const PremiumNavButton = () => {
  const isPremium = useIsPremium()

  if (isPremium) {
    return null
  }

  return (
    <Link
      to="/pricing"
      className="pill-premium inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm focus-visible:focus-ring active:scale-(--scale-press) [&_svg]:size-4 [&_svg]:shrink-0"
    >
      <Crown aria-hidden="true" />
      {m.nav_upgrade_premium()}
    </Link>
  )
}
