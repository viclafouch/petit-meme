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
      className="navbar-premium relative isolate inline-flex h-9 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full bg-(image:--gradient-premium) px-3.5 text-sm font-bold text-(--color-premium-foreground) shadow-(--shadow-premium) focus-visible:focus-ring active:scale-(--scale-press) mouse:hover:shadow-(--shadow-premium-hover) [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:fill-current"
    >
      <Crown aria-hidden="true" />
      {m.nav_upgrade_premium()}
    </Link>
  )
}
