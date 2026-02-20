import React from 'react'
import { ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { MemesList } from '@/components/Meme/memes-list'
import { buttonVariants } from '@/components/ui/button'
import type { MemeWithVideo } from '@/constants/meme'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'

type BestMemesParams = {
  trendingMemesPromise: Promise<MemeWithVideo[]>
}

export const BestMemes = ({ trendingMemesPromise }: BestMemesParams) => {
  const trendingMemes = React.use(trendingMemesPromise)
  const isReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={isReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
      className="flex flex-col gap-y-4"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="text-left text-base font-medium">Mèmes</div>
          <Link
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            to="/memes"
          >
            <span>Tout parcourir</span>
            <ChevronRight size={16} />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Les meilleurs mèmes du moment.
        </p>
      </div>
      <section>
        <MemesList layoutContext="index" memes={trendingMemes} />
      </section>
    </motion.div>
  )
}
