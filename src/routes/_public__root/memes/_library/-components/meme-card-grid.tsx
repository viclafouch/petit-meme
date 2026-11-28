import type React from 'react'
import { useRender } from '@base-ui/react/use-render'
import { MemeCard, type MemeCardProps } from '~/components/meme/meme-card'
import memeCardCss from '~/components/meme/meme-card.css?url'
import { toThumbnailPriority } from '~/components/meme/meme-grid'
import { LoadingSpinner } from '~/components/ui/spinner'
import { useLoadMoreWhenVisible } from '~/hooks/use-load-more-when-visible'
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
  layout?: 'row'
  titleTag?: MemeCardProps['titleTag']
  children?: React.ReactNode
}

export const MemeCardGrid = ({
  cards,
  now,
  authenticatedUserToken,
  label = m.meme_list_label(),
  layout,
  titleTag = 'h2',
  children
}: MemeCardGridProps) => {
  return (
    <div className="meme-grid-wrap">
      <link rel="stylesheet" href={memeCardCss} precedence="default" />
      <ul
        className="meme-grid scrollbar-hidden"
        data-layout={layout}
        aria-label={label}
      >
        {cards.map((card, index) => {
          return (
            <li key={card.meme.id}>
              <MemeCard
                meme={card.meme}
                now={now}
                titleTag={titleTag}
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

type LoadMoreProps = {
  isFetching: boolean
  hasFailed: boolean
  failedMessage: string
  onLoadMore: () => void
  render?: useRender.RenderProp
}

export const LoadMore = ({
  isFetching,
  hasFailed,
  failedMessage,
  onLoadMore,
  render
}: LoadMoreProps) => {
  const sentinelRef = useLoadMoreWhenVisible({
    isFetching,
    hasFailed,
    onLoadMore
  })
  const control = useRender({
    defaultTagName: 'button',
    render,
    props: {
      type: render ? undefined : 'button',
      className: 'pill pill-sm',
      'aria-disabled': isFetching || undefined,
      onClick: (event: React.MouseEvent) => {
        event.preventDefault()

        if (!isFetching) {
          onLoadMore()
        }
      },
      children: (
        <>
          {isFetching ? <LoadingSpinner /> : null}
          {hasFailed ? m.common_retry() : m.meme_load_more()}
        </>
      )
    }
  })

  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-3 pt-10">
      {hasFailed ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {failedMessage}
        </p>
      ) : null}
      {control}
    </div>
  )
}
