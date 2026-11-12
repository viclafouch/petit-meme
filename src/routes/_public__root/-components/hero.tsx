import { ErrorBoundary } from 'react-error-boundary'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '~/components/ui/button'
import { NEWS_CATEGORY_SLUG } from '~/constants/meme'
import { useIsMobile } from '~/hooks/use-mobile'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { countRecentMemesQueryOpts } from '~/queries/meme'
import { FloatingLogos } from './floating-logo'
import {
  Announcement,
  PageActions,
  PageDescription,
  PageHeader,
  PageHeading
} from './page-headers'

const HEADING_WORD_STAGGER_MS = 55

const RISE_IN_CLASS_NAME =
  'animate-in fade-in slide-in-from-bottom-5 fill-mode-both motion-reduce:animate-none'

const ENTRANCE_CLASS_NAME = cn(
  RISE_IN_CLASS_NAME,
  'blur-in-[15px] duration-600'
)

const HEADING_WORD_CLASS_NAME = cn(
  RISE_IN_CLASS_NAME,
  'inline-block whitespace-pre blur-in-[12px] duration-1000'
)

type HeadingPart = {
  text: string
  isEmphasized: boolean
}

const HeroHeading = () => {
  const parts: HeadingPart[] = [
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
      <span className="sr-only">
        {parts
          .map((part) => {
            return part.text
          })
          .join('')}
      </span>
      <span aria-hidden="true">
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
      </span>
    </PageHeading>
  )
}

const AnnouncementQuery = () => {
  const recentMemesCountQuery = useSuspenseQuery(countRecentMemesQueryOpts())

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

  return (
    <PageHeader as="div" className="container">
      <div className={cn(ENTRANCE_CLASS_NAME, 'delay-500')}>
        <ErrorBoundary fallback={null}>
          <AnnouncementQuery />
        </ErrorBoundary>
      </div>
      <HeroHeading />
      <PageDescription className={cn(ENTRANCE_CLASS_NAME, 'delay-800')}>
        {m.home_hero_description()}
      </PageDescription>
      <PageActions className="w-full max-w-sm md:max-w-none justify-center">
        <div
          className={cn(
            ENTRANCE_CLASS_NAME,
            'delay-1100 flex gap-2 flex-col md:flex-row w-full justify-center'
          )}
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
        </div>
      </PageActions>
      {!isMobile ? <FloatingLogos /> : null}
    </PageHeader>
  )
}
