import { Clapperboard, Download, Layers, Type } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toStudioMeme } from '~/helpers/studio-meme'
import { m } from '~/paraglide/messages'
import { listTrendingMemesQueryOpts } from '~/queries/meme'
import { StudioDemo } from './studio-demo'

const getStudioFeatures = () => {
  return [
    {
      Icon: Type,
      title: m.home_studio_feature_slots_title(),
      text: m.home_studio_feature_slots_text()
    },
    {
      Icon: Layers,
      title: m.home_studio_feature_looks_title(),
      text: m.home_studio_feature_looks_text()
    },
    {
      Icon: Download,
      title: m.home_studio_feature_export_title(),
      text: m.home_studio_feature_export_text()
    },
    {
      Icon: Clapperboard,
      title: m.home_studio_feature_access_title(),
      text: m.home_studio_feature_access_text()
    }
  ]
}

export const HomeStudio = () => {
  const trendingQuery = useSuspenseQuery(listTrendingMemesQueryOpts())
  const demoMeme =
    trendingQuery.data.find((meme) => {
      return (meme.video.width ?? 0) > (meme.video.height ?? 0)
    }) ?? trendingQuery.data[0]

  return (
    <section
      aria-labelledby="home-studio"
      className="home-fullscreen relative isolate grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20"
    >
      <span
        aria-hidden="true"
        className="home-studio-glow pointer-events-none absolute -inset-x-4 inset-y-0 -z-10"
      />
      <div className="flex flex-col items-start gap-6">
        <h2 id="home-studio" className="home-split-heading">
          {m.home_studio_title()}
        </h2>
        <p className="max-w-[48ch] text-lg text-muted-foreground text-pretty">
          {m.home_studio_lead()}
        </p>
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {getStudioFeatures().map(({ Icon, title, text }) => {
            return (
              <li key={title} className="flex flex-col gap-1.5">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Icon
                    aria-hidden="true"
                    className="size-4.5 shrink-0 text-brand-violet"
                  />
                  {title}
                </h3>
                <p className="text-muted-foreground text-pretty">{text}</p>
              </li>
            )
          })}
        </ul>
        {demoMeme ? (
          <Link
            to="/memes/$memeId/studio"
            params={{ memeId: demoMeme.id }}
            className="pill pill-brand mt-2 min-h-12 px-6 text-base"
          >
            {m.home_studio_cta()}
          </Link>
        ) : null}
      </div>
      {demoMeme ? <StudioDemo meme={toStudioMeme(demoMeme)} /> : null}
    </section>
  )
}
