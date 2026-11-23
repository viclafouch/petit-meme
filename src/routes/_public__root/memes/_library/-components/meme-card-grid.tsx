import type React from 'react'
import { MemeCard, type MemeCardProps } from '~/components/meme/meme-card'
import memeCardCss from '~/components/meme/meme-card.css?url'
import { toThumbnailPriority } from '~/components/meme/meme-grid'
import { m } from '~/paraglide/messages'

type GridCard = {
  meme: MemeCardProps['meme']
  queryID?: string
  position: number
}

type MemeCardGridProps = {
  cards: GridCard[]
  now: number
  authenticatedUserToken?: string
  label?: string
  children?: React.ReactNode
}

export const MemeCardGrid = ({
  cards,
  now,
  authenticatedUserToken,
  label = m.meme_list_label(),
  children
}: MemeCardGridProps) => {
  return (
    <div className="meme-grid-wrap">
      <link rel="stylesheet" href={memeCardCss} precedence="default" />
      <ul className="meme-grid" aria-label={label}>
        {cards.map((card, index) => {
          return (
            <li key={card.meme.id}>
              <MemeCard
                meme={card.meme}
                now={now}
                titleTag="h2"
                queryID={card.queryID}
                position={card.position}
                authenticatedUserToken={authenticatedUserToken}
                priority={toThumbnailPriority(index)}
              />
            </li>
          )
        })}
      </ul>
      {children}
    </div>
  )
}
