/* eslint-disable id-length */
import React from 'react'
import type { Variants } from 'framer-motion'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { TextEffect } from '@/components/ui/text-effect'
import { NEWS_CATEGORY_SLUG } from '@/constants/meme'
import { useIsMobile } from '@/hooks/use-mobile'
import { getRecentCountMemesQueryOpts } from '@/lib/queries'
import { cn } from '@/lib/utils'
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
      text={`${recentMemesCountQuery.data} nouveaux mèmes ajoutés récemment !`}
    />
  ) : null
}

export const Hero = () => {
  const isMobile = useIsMobile()

  return (
    <PageHeader as="div">
      <React.Suspense fallback={<div />}>
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          custom={{ delay: 0.5 }}
        >
          <AnnouncementQuery />
        </motion.div>
      </React.Suspense>
      <PageHeading className="text-foreground/70">
        <TextEffect
          as="span"
          preset="fade-in-blur"
          speedReveal={h1Transition.speedReveal}
          speedSegment={h1Transition.speedSegment}
          delay={h1Transition.delay}
        >
          <span className="text-foreground">Ta</span> banque de mèmes vidéo,{' '}
          <span className="text-foreground">prête à faire</span> rire{' '}
          <span className="text-foreground">Internet</span>
        </TextEffect>
      </PageHeading>
      <PageDescriptionMotion
        variants={variants}
        initial="hidden"
        animate="visible"
        custom={{ delay: 0.8 }}
      >
        <span className="text-foreground font-bold">Explorez</span> la{' '}
        <span className="text-foreground font-bold">plus grande</span>{' '}
        collection de{' '}
        <span className="text-foreground font-bold">mèmes vidéo</span> et
        partagez-les en{' '}
        <span className="text-foreground font-bold">1 clic</span>. Ajoutez{' '}
        <span className="text-foreground font-bold">du texte</span> pour les
        rendre <span className="text-foreground font-bold">uniques</span>.
      </PageDescriptionMotion>
      <PageActions className="w-full max-w-sm md:max-w-none justify-center">
        <motion.div
          variants={variants}
          initial="hidden"
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
            Découvrir —{' '}
            <span className="font-normal italic">c&apos;est gratuit</span>
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
            Mode premium{' '}
            <span aria-hidden="true" className="text-[16px]">
              🎉
            </span>
          </Link>
        </motion.div>
      </PageActions>
      {!isMobile ? <FloatingLogos variants={variants} /> : null}
    </PageHeader>
  )
}
