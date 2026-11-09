export function parseKeywordsInput(input: string) {
  return input
    .split(',')
    .map((keyword) => {
      return keyword.trim().toLowerCase()
    })
    .filter(Boolean)
}

export function normalizeKeywords(keywords: string[]) {
  return keywords.map((keyword) => {
    return keyword.toLowerCase().trim()
  })
}
