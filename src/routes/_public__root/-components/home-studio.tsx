import { Clapperboard, Download, Layers, Type } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toStudioMeme } from '~/helpers/studio-meme'
import { m } from '~/paraglide/messages'
import { listTrendingMemesQueryOpts } from '~/queries/meme'
import { HomeShowcaseSection } from './home-showcase-section'
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
    <HomeShowcaseSection
      headingId="home-studio"
      title={m.home_studio_title()}
      lead={m.home_studio_lead()}
      glowClassName="bg-(image:--gradient-glow-studio)"
      visual={demoMeme ? <StudioDemo meme={toStudioMeme(demoMeme)} /> : null}
    >
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
    </HomeShowcaseSection>
  )
}
