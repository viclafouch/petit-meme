import { ErrorBoundary } from 'react-error-boundary'
import type { Variants } from 'motion/react'
import { motion, useReducedMotion } from 'motion/react'
import { buttonVariants } from '@/components/ui/button'
import { TextEffect } from '@/components/ui/text-effect'
import { NEWS_CATEGORY_SLUG } from '@/constants/meme'
import { useIsMobile } from '@/hooks/use-mobile'
import { getRecentCountMemesQueryOpts } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FloatingLogos } from './floating-logo'
import {
  Announcement,
  PageActions,
  PageDescription,
  PageHeader,
  PageHeading
} from './page-headers'

const h1Transition = {
  delay: 0,
  speedReveal: 0.9,
  speedSegment: 0.3
}

const variants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: 'blur(15px)'
  },
  visible: (custom: { delay?: number; duration?: number }) => {
    return {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        delay: custom?.delay ?? 0,
        duration: custom?.duration ?? 0.6
      }
    }
  }
} as const satisfies Variants

const PageDescriptionMotion = motion.create(PageDescription)

const AnnouncementQuery = () => {
  const recentMemesCountQuery = useSuspenseQuery(getRecentCountMemesQueryOpts())

  return recentMemesCountQuery.data > 0 ? (
    <Announcement
      linkOptions={{
        to: '/memes/category/$slug',
        params: { slug: NEWS_CATEGORY_SLUG }
      }}
      text={m.home_hero_announcement({
        count: String(recentMemesCountQuery.data)
      })}
    />
  ) : null
}

export const Hero = () => {
  const isMobile = useIsMobile()
  const isReducedMotion = useReducedMotion()

  return (
    <PageHeader as="div">
      <motion.div
        variants={variants}
        initial={isReducedMotion ? false : 'hidden'}
        animate="visible"
        custom={{ delay: 0.5 }}
      >
        <ErrorBoundary fallback={null}>
          <AnnouncementQuery />
        </ErrorBoundary>
      </motion.div>
      <PageHeading className="text-foreground/70">
        <TextEffect
          as="span"
          preset="fade-in-blur"
          speedReveal={h1Transition.speedReveal}
          speedSegment={h1Transition.speedSegment}
          delay={h1Transition.delay}
        >
          <span className="text-foreground">{m.home_hero_h1_1()}</span>
          {m.home_hero_h1_2()}
          <span className="text-foreground">{m.home_hero_h1_3()}</span>
          {m.home_hero_h1_4()}
          <span className="text-foreground">{m.home_hero_h1_5()}</span>
        </TextEffect>
      </PageHeading>
      <PageDescriptionMotion
        variants={variants}
        initial={isReducedMotion ? false : 'hidden'}
        animate="visible"
        custom={{ delay: 0.8 }}
      >
        {m.home_hero_description()}
      </PageDescriptionMotion>
      <PageActions className="w-full max-w-sm md:max-w-none justify-center">
        <motion.div
          variants={variants}
          initial={isReducedMotion ? false : 'hidden'}
          animate="visible"
          className="flex gap-2 flex-col md:flex-row w-full justify-center"
          custom={{ delay: 1.1 }}
        >
          <Link
            viewTransition
            className={cn(
              buttonVariants({
                size: 'xl',
                variant: 'defaultWithOutline'
              }),
              'rounded-full before:rounded-full'
            )}
            to="/memes"
          >
            {m.home_hero_cta_discover()}{' '}
            <span className="font-normal italic">{m.home_hero_cta_free()}</span>
          </Link>
          <Link
            viewTransition
            className={cn(
              buttonVariants({
                size: 'xl',
                variant: 'secondaryWithOutline'
              }),
              'rounded-full before:rounded-full'
            )}
            to="/pricing"
          >
            {m.home_hero_cta_premium()}{' '}
            <span aria-hidden="true" className="text-base">
              🎉
            </span>
          </Link>
        </motion.div>
      </PageActions>
      {!isMobile ? <FloatingLogos variants={variants} /> : null}
    </PageHeader>
  )
}
