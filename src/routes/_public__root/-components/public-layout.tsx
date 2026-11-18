import { getRouteApi, Outlet, useMatchRoute } from '@tanstack/react-router'
import { StarsBackground } from '~/components/animate-ui/backgrounds/stars'
import { SentryFeedbackWidget } from '~/components/app/sentry-feedback-widget'
import { Footer } from '~/components/layout/footer'
import { Navbar } from '~/components/layout/navbar'
import { SiteBanners } from '~/components/layout/site-banners'
import { TabBar } from '~/components/layout/tab-bar/tab-bar'
import { m } from '~/paraglide/messages'

const publicRouteApi = getRouteApi('/_public__root')

export const PublicLayout = () => {
  const { _suggestedLocale, _announcementDismissed } =
    publicRouteApi.useLoaderData()
  const matchRoute = useMatchRoute()
  const isHomePage = matchRoute({ to: '/' }) !== false
  const isStudio = matchRoute({ to: '/memes/$memeId/studio' }) !== false

  return (
    <StarsBackground animated={isHomePage}>
      <div
        data-public-shell
        className="z-10 relative min-h-dvh flex flex-col pt-[env(safe-area-inset-top,0px)] pb-(--tab-bar-space)"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-60 focus:top-4 focus:left-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium"
        >
          {m.common_skip_to_content()}
        </a>
        <SiteBanners
          suggestedLocale={_suggestedLocale}
          isAnnouncementInitiallyDismissed={_announcementDismissed}
        />
        <div
          data-public-navbar
          className="sticky top-[env(safe-area-inset-top,0px)] z-50"
        >
          <Navbar />
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col outline-none"
        >
          <Outlet />
        </main>
        <Footer className={isHomePage ? undefined : 'max-lg:hidden'} />
      </div>
      <TabBar />
      {isStudio ? null : <SentryFeedbackWidget />}
    </StarsBackground>
  )
}
