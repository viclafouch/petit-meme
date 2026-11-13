type MemeHighlightedTitleProps = {
  title: string
  highlightedTitle?: string
}

export const MemeHighlightedTitle = ({
  title,
  highlightedTitle
}: MemeHighlightedTitleProps) => {
  if (!highlightedTitle) {
    return title
  }

  return (
    <span
      className="[&>em]:not-italic [&>em]:bg-yellow-200 [&>em]:text-black [&>em]:rounded-sm"
      // oxlint-disable-next-line react/no-danger -- Algolia returns the highlighted title as HTML with <em> tags
      dangerouslySetInnerHTML={{ __html: highlightedTitle }}
    />
  )
}
