import React from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { MemesList } from '@/components/Meme/memes-list'
import type { MemeWithVideo } from '@/constants/meme'
import { Link } from '@tanstack/react-router'

export const Demo = ({
  bestMemesPromise
}: {
  bestMemesPromise: Promise<MemeWithVideo[]>
}) => {
  const bestMemesQuery = React.use(bestMemesPromise)

  return (
    <div className="container">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="flex flex-col gap-y-4 mt-12"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="text-left text-base font-medium">Mèmes</div>
            <Link
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-100 focus:text-gray-100"
              to="/memes"
            >
              <span>Tout parcourir</span>
              <ChevronRight size={16} />
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            Les meilleurs mèmes du moment.
          </p>
        </div>
        <section>
          <MemesList layoutContext="index" memes={bestMemesQuery} />
        </section>
      </motion.div>
    </div>
  )
}
