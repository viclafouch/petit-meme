import React from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { StarsBackground } from '~/components/animate-ui/backgrounds/stars'
import { Footer } from '~/components/footer'
import { LocaleBanner } from '~/components/locale-banner'
import { Navbar } from '~/components/navbar'
import { SentryFeedbackWidget } from '~/components/sentry-feedback-widget'
import { getLocaleBannerDismissed } from '~/lib/locale-banner'
import { getMemesListQueryOpts } from '~/lib/queries'
import { m } from '~/paraglide/messages.js'

const RouteComponent = () => {
  const { _localeBannerDismissed } = Route.useLoaderData()

  return (
    <StarsBackground>
      <div className="z-10 relative min-h-dvh flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-60 focus:top-4 focus:left-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium"
        >
          {m.common_skip_to_content()}
        </a>
        <LocaleBanner isInitiallyDismissed={_localeBannerDismissed} />
        <Navbar />
        <div className="h-(--navbar-height)" aria-hidden="true" />
        <main id="main-content" className="flex flex-1 flex-col">
          <Outlet />
        </main>
        <Footer />
      </div>
      <SentryFeedbackWidget />
    </StarsBackground>
  )
}

export const Route = createFileRoute('/_public__root')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(getMemesListQueryOpts({}))

    return {
      _localeBannerDismissed: getLocaleBannerDismissed()
    }
  },
  component: RouteComponent
})
