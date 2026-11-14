import {
  Clapperboard,
  House,
  LayoutGrid,
  Search,
  UserRound
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'

type DemoTabBarProps = {
  activeTab: 'memes' | 'reels'
  className?: string
}

export const DemoTabBar = ({ activeTab, className }: DemoTabBarProps) => {
  const tabs = [
    { id: 'home', Icon: House, label: m.nav_home() },
    { id: 'memes', Icon: LayoutGrid, label: m.nav_memes() },
    { id: 'reels', Icon: Clapperboard, label: m.nav_reels() },
    { id: 'search', Icon: Search, label: m.nav_search() },
    { id: 'account', Icon: UserRound, label: m.nav_account() }
  ]

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 grid grid-cols-5 border-t border-white/10 pt-[2cqw] pb-[6.5cqw]',
        className
      )}
    >
      {tabs.map(({ id, Icon, label }) => {
        return (
          <span
            key={id}
            className={cn(
              'flex flex-col items-center gap-[0.8cqw] text-[2.3cqw]',
              id === activeTab ? 'text-white' : 'text-white/45'
            )}
          >
            <Icon className="size-[5cqw]" strokeWidth={1.8} />
            {label}
          </span>
        )
      })}
    </div>
  )
}
