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
    <Link to="/pricing" className="navbar-premium">
      <Crown aria-hidden="true" />
      {m.nav_upgrade_premium()}
    </Link>
  )
}
