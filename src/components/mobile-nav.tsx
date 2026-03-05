import React from 'react'
import type { NavigationLink } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { Link } from '@tanstack/react-router'

type MobileNavProps = {
  links: NavigationLink[]
}

export const MobileNav = ({ links }: MobileNavProps) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'block size-8 touch-manipulation items-center justify-start gap-2.5 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent md:hidden dark:hover:bg-transparent'
          )}
        >
          <div className="relative flex items-center justify-center">
            <div className="relative size-4">
              <span
                className={cn(
                  'bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100',
                  isOpen ? 'top-[0.4rem] -rotate-45' : 'top-1'
                )}
              />
              <span
                className={cn(
                  'bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100',
                  isOpen ? 'top-[0.4rem] rotate-45' : 'top-2.5'
                )}
              />
            </div>
            <span className="sr-only">{m.nav_toggle_menu()}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-background/90 h-(--radix-popover-content-available-height) w-(--radix-popover-content-available-width) overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur duration-100"
        align="start"
        side="bottom"
      >
        <div className="flex flex-col gap-12 overflow-auto p-6">
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm font-medium">
              {m.nav_menu()}
            </p>
            <div className="flex flex-col gap-3">
              {links.map((link, index) => {
                return (
                  <Link
                    key={index}
                    to={link.to}
                    preload={link.preload}
                    className={cn('text-2xl font-medium', link.className)}
                    onClick={() => {
                      setIsOpen(false)
                    }}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
