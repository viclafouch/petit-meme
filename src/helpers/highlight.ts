export type HighlightedText = {
  text: string
  isHighlighted: boolean
}[]

const HIGHLIGHT_TAG_PATTERN = /<em>(.*?)<\/em>/gsu

const ESCAPED_HTML_ENTITY_PATTERN = /&(?:amp|lt|gt|quot|#39|#x27);/gu

const HTML_ENTITY_CHARACTERS = new Map([
  ['&amp;', '&'],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#39;', "'"],
  ['&#x27;', "'"]
])

const unescapeHtml = (escaped: string) => {
  return escaped.replaceAll(ESCAPED_HTML_ENTITY_PATTERN, (entity) => {
    return HTML_ENTITY_CHARACTERS.get(entity) ?? entity
  })
}

export const parseHighlightedHtml = (html: string): HighlightedText => {
  const segments: HighlightedText = []
  let cursor = 0

  for (const match of html.matchAll(HIGHLIGHT_TAG_PATTERN)) {
    if (match.index > cursor) {
      segments.push({
        text: unescapeHtml(html.slice(cursor, match.index)),
        isHighlighted: false
      })
    }

    segments.push({ text: unescapeHtml(match[1] ?? ''), isHighlighted: true })
    cursor = match.index + match[0].length
  }

  if (cursor < html.length) {
    segments.push({
      text: unescapeHtml(html.slice(cursor)),
      isHighlighted: false
    })
  }

  return segments
}
