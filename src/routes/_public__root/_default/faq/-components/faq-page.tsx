import { ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { m } from '~/paraglide/messages'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'
import { getFaqItems } from './faq-items'

export const FaqPage = () => {
  const faqItems = getFaqItems()

  return (
    <div className="container flex max-w-3xl flex-col gap-12 py-10 sm:py-16">
      <header className="flex flex-col gap-4">
        <PageHeading>{m.faq_title()}</PageHeading>
        <PageDescription>{m.faq_description()}</PageDescription>
      </header>
      <div className="flex flex-col divide-y">
        {faqItems.map((item) => {
          return (
            <section key={item.question} className="flex flex-col gap-3 py-7">
              <h2 className="font-bricolage text-xl font-semibold text-balance sm:text-2xl">
                {item.question}
              </h2>
              <p className="text-muted-foreground text-pretty sm:text-lg">
                {item.answer}
              </p>
              {item.leadsToDmca ? (
                <Link
                  to="/dmca"
                  className="inline-flex items-center gap-1 self-start rounded-sm font-semibold underline decoration-foreground/30 underline-offset-4 focus-visible:focus-ring mouse:hover:decoration-foreground"
                >
                  {m.faq_takedown_link()}
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              ) : null}
            </section>
          )
        })}
      </div>
      <Link
        to="/memes/category/$slug"
        params={{ slug: ALL_CATEGORY_SLUG }}
        className="pill pill-brand self-center min-h-12 px-6 text-base"
      >
        {m.home_hero_cta_discover()} {m.home_hero_cta_free()}
      </Link>
    </div>
  )
}
