import React from 'react'
import { Moon, Sun } from 'lucide-react'
import type { TargetAndTransition, Transition } from 'motion/react'
import { motion } from 'motion/react'
import { Switch } from 'radix-ui'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { ClientOnly } from '@tanstack/react-router'

const SPRING_NO_BOUNCE = {
  type: 'spring',
  bounce: 0
} as const satisfies Transition
const THUMB_SPRING = {
  type: 'spring',
  stiffness: 300,
  damping: 25
} as const satisfies Transition
const VISIBLE = { scale: 1, opacity: 1 } as const satisfies TargetAndTransition
const HIDDEN = { scale: 0, opacity: 0 } as const satisfies TargetAndTransition

export const ThemeSwitcher = ({ className }: { className?: string }) => {
  const { setTheme, theme } = useTheme()
  const [isTapped, setIsTapped] = React.useState(false)
  const isDark = theme === 'dark'

  return (
    <ClientOnly>
      <Switch.Root
        checked={isDark}
        onCheckedChange={(checked) => {
          return setTheme(checked ? 'dark' : 'light')
        }}
        asChild
      >
        <motion.button
          data-slot="switch"
          className={cn(
            'relative flex p-0.75 h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input data-[state=checked]:justify-end data-[state=unchecked]:justify-start',
            className
          )}
          initial={false}
          onTapStart={() => {
            return setIsTapped(true)
          }}
          onTapCancel={() => {
            return setIsTapped(false)
          }}
          onTap={() => {
            return setIsTapped(false)
          }}
        >
          <span className="sr-only">
            Activer thème {isDark ? 'clair' : 'sombre'}
          </span>
          <motion.div
            data-slot="switch-left-icon"
            animate={isDark ? VISIBLE : HIDDEN}
            transition={SPRING_NO_BOUNCE}
            className="absolute [&_svg]:size-3 left-1 top-1/2 -translate-y-1/2 dark:text-neutral-500 text-neutral-400"
          >
            <Sun />
          </motion.div>
          <motion.div
            data-slot="switch-right-icon"
            animate={isDark ? HIDDEN : VISIBLE}
            transition={SPRING_NO_BOUNCE}
            className="absolute [&_svg]:size-3 right-1 top-1/2 -translate-y-1/2 dark:text-neutral-400 text-neutral-500"
          >
            <Moon />
          </motion.div>
          <Switch.Thumb asChild>
            <motion.div
              data-slot="switch-thumb"
              className="relative z-[1] flex size-[18px] items-center justify-center rounded-full bg-background shadow-lg ring-0"
              layout
              transition={THUMB_SPRING}
              animate={
                isTapped
                  ? { width: 21, transition: { duration: 0.1 } }
                  : { width: 18, transition: { duration: 0.1 } }
              }
            />
          </Switch.Thumb>
        </motion.button>
      </Switch.Root>
    </ClientOnly>
  )
}
