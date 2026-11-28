import type React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, type LinkOptions } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { CookieTrigger } from '~/components/cookie-consent/cookie-trigger'
import { AppIcon } from '~/components/install/app-icon'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { getLegalLinks } from '~/constants/navigation'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listCategoriesQueryOpts } from '~/queries/category'
import { sortByMemeCount } from '~/routes/_public__root/memes/-lib/library'
import { useCookieConsentStore } from '~/stores/cookie-consent.store'

const FOOTER_CATEGORY_COUNT = 6

const FOOTER_LINK_CLASS_NAME =
  'rounded-sm text-sm text-muted-foreground transition-colors focus-visible:focus-ring pointer-coarse:inline-block pointer-coarse:py-1 mouse:hover:text-foreground'

type FooterLink = {
  label: string
  linkOptions: LinkOptions
}

type FooterColumnProps = {
  title: string
  links: FooterLink[]
  children?: React.ReactNode
}

const FooterColumn = ({ title, links, children }: FooterColumnProps) => {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((link) => {
          return (
            <li key={link.label}>
              <Link {...link.linkOptions} className={FOOTER_LINK_CLASS_NAME}>
                {link.label}
              </Link>
            </li>
          )
        })}
        {children}
      </ul>
    </nav>
  )
}

const getMemeLinks = (): FooterLink[] => {
  return [
    {
      label: m.footer_all_memes(),
      linkOptions: {
        to: '/memes/category/$slug',
        params: { slug: ALL_CATEGORY_SLUG }
      }
    },
    {
      label: m.footer_new_memes(),
      linkOptions: {
        to: '/memes/category/$slug',
        params: { slug: ALL_CATEGORY_SLUG },
        search: { sort: 'new' }
      }
    },
    {
      label: m.footer_trending_memes(),
      linkOptions: {
        to: '/memes/category/$slug',
        params: { slug: ALL_CATEGORY_SLUG },
        search: { sort: 'trending' }
      }
    },
    { label: m.footer_ai_search(), linkOptions: { to: '/memes/ai-search' } },
    { label: m.footer_random_meme(), linkOptions: { to: '/random' } }
  ]
}

const getSiteLinks = (): FooterLink[] => {
  return [
    { label: m.footer_app(), linkOptions: { to: '/app' } },
    { label: m.footer_premium(), linkOptions: { to: '/pricing' } },
    { label: m.footer_faq(), linkOptions: { to: '/faq' } },
    { label: m.footer_submit(), linkOptions: { to: '/submit' } }
  ]
}

const useCategoryLinks = (): FooterLink[] => {
  const categoriesQuery = useSuspenseQuery(listCategoriesQueryOpts(getLocale()))

  return sortByMemeCount(categoriesQuery.data)
    .slice(0, FOOTER_CATEGORY_COUNT)
    .map((category) => {
      return {
        label: category.title,
        linkOptions: {
          to: '/memes/category/$slug',
          params: { slug: category.slug }
        }
      }
    })
}

type FooterProps = {
  className?: string
}

export const Footer = ({ className }: FooterProps) => {
  const categoryLinks = useCategoryLinks()
  const hasConsented = useSelector(useCookieConsentStore(), (state) => {
    return state.consent.hasConsented
  })
  const legalLinks = getLegalLinks().map((link): FooterLink => {
    return { label: link.label, linkOptions: { to: link.to } }
  })

  return (
    <footer className={cn('relative border-t bg-background/40', className)}>
      <div className="container-wide grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
        <div className="flex max-w-xs flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <AppIcon size={96} className="size-10" />
          <p className="text-sm text-muted-foreground text-pretty">
            {m.footer_tagline()}
          </p>
        </div>
        <FooterColumn title={m.footer_memes_heading()} links={getMemeLinks()} />
        <FooterColumn
          title={m.footer_categories_heading()}
          links={categoryLinks}
        />
        <FooterColumn title={m.footer_site_heading()} links={getSiteLinks()} />
        <FooterColumn title={m.footer_legal_heading()} links={legalLinks}>
          {hasConsented ? (
            <li>
              <CookieTrigger />
            </li>
          ) : null}
        </FooterColumn>
      </div>
    </footer>
  )
}
