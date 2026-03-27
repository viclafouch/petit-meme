/* oxlint-disable id-length */
import * as React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

type IconButtonStarsProps = React.ComponentProps<typeof Button> & {
  active?: boolean
  className?: string
  onlyStars?: boolean
}

const IconButtonStars = ({
  className,
  active = false,
  onlyStars = false,
  children,
  ...props
}: IconButtonStarsProps) => {
  return (
    <Button
      data-slot="icon-button"
      className={cn(
        `group/icon-button relative [&>svg]:text-black dark:[&>svg]:text-white`,
        className,
        active && !onlyStars
          ? '[&>svg]:fill-black dark:[&>svg]:fill-white'
          : '[&>svg]:fill-transparent'
      )}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children}
      <AnimatePresence initial={false}>
        {active ? (
          <>
            {[...Array(6)].map((_, index) => {
              return (
                <motion.div
                  key={index}
                  className="absolute w-1 h-1 rounded-full dark:bg-white bg-black"
                  initial={{ x: '50%', y: '50%', scale: 0, opacity: 0 }}
                  animate={{
                    x: `calc(50% + ${Math.cos((index * Math.PI) / 3) * 30}px)`,
                    y: `calc(50% + ${Math.sin((index * Math.PI) / 3) * 30}px)`,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: 'easeOut'
                  }}
                />
              )
            })}
          </>
        ) : null}
      </AnimatePresence>
    </Button>
  )
}

export { IconButtonStars, type IconButtonStarsProps }
