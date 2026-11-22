import { MemeCard, type MemeCardProps } from '~/components/meme/meme-card'
import {
  toThumbnailPriority,
  useMemesViewEvent
} from '~/components/meme/meme-grid'
import { MEMES_PER_PAGE } from '~/constants/meme'
import { m } from '~/paraglide/messages'
import memeCardCss from './meme-card.css?url'

type MemeWithHighlight = MemeCardProps['meme']

type MemesListProps = {
  memes: MemeWithHighlight[]
  queryID?: string
  page?: number
  now?: number
  isAboveTheFold?: boolean
  titleTag?: MemeCardProps['titleTag']
}

export const MemesList = ({
  memes,
  queryID,
  page = 0,
  now,
  isAboveTheFold = true,
  titleTag
}: MemesListProps) => {
  const authenticatedUserToken = useMemesViewEvent(memes)

  if (memes.length === 0) {
    return <p className="text-muted-foreground">{m.common_no_results()}</p>
  }

  return (
    <div className="meme-grid-wrap">
      <link rel="stylesheet" href={memeCardCss} precedence="default" />
      <ul className="meme-grid" aria-label={m.meme_list_label()}>
        {memes.map((meme, index) => {
          return (
            <li key={meme.id}>
              <MemeCard
                meme={meme}
                now={now}
                titleTag={titleTag}
                queryID={queryID}
                position={page * MEMES_PER_PAGE + index + 1}
                authenticatedUserToken={authenticatedUserToken}
                priority={toThumbnailPriority(index, isAboveTheFold)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
