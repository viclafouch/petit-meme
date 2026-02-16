import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { LinkOptions } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

type MobileNavProps = {
  nav: {
    name: string
    items: {
      label: string
      to: LinkOptions['to']
      className?: string
      preload: LinkOptions['preload']
    }[]
  }[]
}

export const MobileNav = ({ nav }: MobileNavProps) => {
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
            <span className="sr-only">Toggle Menu</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-background/90 h-(--radix-popover-content-available-height) w-(--radix-popover-content-available-width) overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur duration-100"
        align="start"
        side="bottom"
      >
        <div className="flex flex-col gap-12 overflow-auto p-6">
          {nav.map((category, index) => {
            return (
              <div className="flex flex-col gap-4" key={index}>
                <p className="text-muted-foreground text-sm font-medium">
                  {category.name}
                </p>
                <div className="flex flex-col gap-3">
                  {category.items.map((item, itemIndex) => {
                    return (
                      <Link
                        key={itemIndex}
                        to={item.to}
                        preload={item.preload}
                        className={cn('text-2xl font-medium', item.className)}
                        onClick={() => {
                          setIsOpen(false)
                        }}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
