import { ErrorBoundary } from 'react-error-boundary'
import { ChevronRight, Crown } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { IntroOncePerSessionScript } from '~/components/app/intro-once-per-session-script'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { formatCount } from '~/helpers/number'
import { useIntroOncePerSession } from '~/hooks/use-intro-once-per-session'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { countRecentMemesQueryOpts, listMemesQueryOpts } from '~/queries/meme'
import { NEW_MEMES_FILTERS } from '~/routes/_public__root/-lib/home'
import { FloatingLogos } from './floating-logos'
import {
  PageActions,
  PageDescription,
  PageHeader,
  PageHeading
} from './page-headers'

const HERO_INTRO_KEY = 'home-hero'
const HEADING_WORD_STAGGER_MS = 55
const BADGE_THUMBNAIL_COUNT = 3

const RISE_IN_CLASS_NAME =
  'animate-in fade-in slide-in-from-bottom-5 fill-mode-both motion-reduce:animate-none intro-seen:animate-none'

const ENTRANCE_CLASS_NAME = cn(
  RISE_IN_CLASS_NAME,
  'blur-in-[15px] duration-600'
)

const HEADING_WORD_CLASS_NAME = cn(
  RISE_IN_CLASS_NAME,
  'inline-block whitespace-pre blur-in-[12px] duration-1000'
)

const HeroHeading = () => {
  const parts = [
    { text: m.home_hero_h1_1(), isEmphasized: true },
    { text: m.home_hero_h1_2(), isEmphasized: false },
    { text: m.home_hero_h1_3(), isEmphasized: true },
    { text: m.home_hero_h1_4(), isEmphasized: false },
    { text: m.home_hero_h1_5(), isEmphasized: true }
  ]

  const words = parts
    .flatMap((part) => {
      return part.text.split(/(\s+)/u).map((text) => {
        return { text, isEmphasized: part.isEmphasized }
      })
    })
    .filter((word) => {
      return word.text !== ''
    })
    .map((word, position) => {
      return { ...word, position }
    })

  return (
    <PageHeading className="text-foreground/70">
      {words.map((word) => {
        return (
          <span
            key={word.position}
            className={cn(
              HEADING_WORD_CLASS_NAME,
              word.isEmphasized && 'text-foreground'
            )}
            style={{
              animationDelay: `${word.position * HEADING_WORD_STAGGER_MS}ms`
            }}
          >
            {word.text}
          </span>
        )
      })}
    </PageHeading>
  )
}

const NewMemesBadge = () => {
  const recentCountQuery = useSuspenseQuery(countRecentMemesQueryOpts())
  const newMemesQuery = useSuspenseQuery(listMemesQueryOpts(NEW_MEMES_FILTERS))

  if (recentCountQuery.data === 0) {
    return null
  }

  const countParams = {
    count: recentCountQuery.data,
    formattedCount: formatCount(recentCountQuery.data, getLocale(), 'standard')
  }

  return (
    <Link
      to="/memes/category/$slug"
      params={{ slug: ALL_CATEGORY_SLUG }}
      search={{ sort: 'new' }}
      className="new-memes-badge group relative isolate inline-flex touch-manipulation overflow-hidden rounded-full p-[1.5px] shadow-(--shadow-badge) transition-[scale,box-shadow] duration-(--duration-press) ease-(--ease-out-strong) select-none focus-visible:focus-ring active:scale-(--scale-press) mouse:hover:shadow-(--shadow-badge-hover)"
    >
      <span className="flex items-center gap-2.5 rounded-full bg-background/85 py-1 ps-1.5 pe-3.5 text-sm font-semibold whitespace-nowrap">
        <span aria-hidden="true" className="flex -space-x-2">
          {newMemesQuery.data.memes
            .slice(0, BADGE_THUMBNAIL_COUNT)
            .map((meme) => {
              return (
                <span
                  key={meme.id}
                  className="size-6.5 rounded-full bg-muted bg-cover bg-center ring-2 ring-background"
                  style={{
                    backgroundImage: `url("${buildVideoImageUrl(meme.video.bunnyId)}")`
                  }}
                />
              )
            })}
        </span>
        <span>
          <strong className="bg-(image:--gradient-brand) bg-clip-text font-bold text-transparent">
            {m.home_hero_new_memes(countParams)}
          </strong>
          <span className="max-sm:sr-only">
            {' '}
            {m.home_hero_new_memes_added(countParams)}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-transform duration-(--duration-fast) mouse:group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  )
}

export const Hero = () => {
  const introRef = useIntroOncePerSession<HTMLDivElement>(HERO_INTRO_KEY)

  return (
    <PageHeader
      as="div"
      ref={introRef}
      suppressHydrationWarning
      className="container isolate min-h-[calc(100svh-var(--navbar-space)-var(--tab-bar-space))] justify-center pt-10 pb-20 lg:py-16"
    >
      <IntroOncePerSessionScript introKey={HERO_INTRO_KEY} />
      <div className="relative flex w-full flex-col items-center gap-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-24 -top-32 -bottom-24 -z-10 bg-(image:--gradient-glow) opacity-(--opacity-glow) [mask-image:radial-gradient(closest-side,black_55%,transparent)]"
        />
        <div className={cn(ENTRANCE_CLASS_NAME, 'delay-500')}>
          <ErrorBoundary fallback={null}>
            <NewMemesBadge />
          </ErrorBoundary>
        </div>
        <HeroHeading />
        <PageDescription className={cn(ENTRANCE_CLASS_NAME, 'delay-800')}>
          {m.home_hero_description()}
        </PageDescription>
        <PageActions className="w-full max-w-sm justify-center md:max-w-none">
          <div
            className={cn(
              ENTRANCE_CLASS_NAME,
              'flex w-full flex-col justify-center gap-3 delay-1100 md:flex-row'
            )}
          >
            <Link
              viewTransition
              className="pill pill-brand min-h-13 px-7 text-base shadow-(--shadow-brand-glow)"
              to="/memes/category/$slug"
              params={{ slug: ALL_CATEGORY_SLUG }}
            >
              {m.home_hero_cta_discover()}{' '}
              <span className="font-medium italic">
                {m.home_hero_cta_free()}
              </span>
            </Link>
            <Link
              viewTransition
              className="pill pill-premium min-h-13 px-7 text-base"
              to="/pricing"
            >
              <Crown aria-hidden="true" className="size-5" />
              {m.home_hero_cta_premium()}
            </Link>
          </div>
        </PageActions>
        <FloatingLogos />
      </div>
    </PageHeader>
  )
}
