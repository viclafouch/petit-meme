import React from 'react'
import { TabBar } from '~/components/layout/tab-bar/tab-bar'
import { useSettledViewportHeight } from '~/routes/reels/-lib/use-settled-viewport-height'
import { ReelsFeed } from './reels-feed'

export const ReelsPage = () => {
  const pageRef = React.useRef<HTMLDivElement>(null)

  useSettledViewportHeight(pageRef)

  return (
    <div ref={pageRef} className="dark reels-page bg-black text-foreground">
      <main className="relative mx-auto h-(--reels-height) lg:max-w-reels">
        <ReelsFeed />
      </main>
      <TabBar />
    </div>
  )
}
