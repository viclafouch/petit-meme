import { ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { MemesList } from '~/components/meme/memes-list'
import { buttonVariants } from '~/components/ui/button'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { listTrendingMemesQueryOpts } from '~/queries/meme'

export const BestMemes = () => {
  const trendingMemesQuery = useSuspenseQuery(listTrendingMemesQueryOpts())
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
          <div className="text-left text-base font-medium">
            {m.home_best_title()}
          </div>
          <Link
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            to="/memes/category/$slug"
            params={{ slug: ALL_CATEGORY_SLUG }}
          >
            <span>{m.home_best_browse_all()}</span>
            <ChevronRight size={16} />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {m.home_best_subtitle()}
        </p>
      </div>
      <section>
        <MemesList memes={trendingMemesQuery.data} isAboveTheFold={false} />
      </section>
    </motion.div>
  )
}
