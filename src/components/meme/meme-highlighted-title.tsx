import React from 'react'
import type { HighlightedText } from '~/helpers/highlight'

type MemeHighlightedTitleProps = {
  title: string
  highlightedTitle?: HighlightedText
}

export const MemeHighlightedTitle = ({
  title,
  highlightedTitle
}: MemeHighlightedTitleProps) => {
  if (!highlightedTitle) {
    return title
  }

  return highlightedTitle.map((segment, index) => {
    const key = `${index}-${segment.text}`

    return segment.isHighlighted ? (
      <mark key={key} className="rounded-sm bg-yellow-200 text-black">
        {segment.text}
      </mark>
    ) : (
      <React.Fragment key={key}>{segment.text}</React.Fragment>
    )
  })
}
