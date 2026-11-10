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

function splitIntoSearchWords(text: string) {
  return text
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

type KeepNewKeywordsParams = {
  keywords: string[]
  knownTexts: string[]
}

export function keepNewKeywords({
  keywords,
  knownTexts
}: KeepNewKeywordsParams) {
  const knownWords = new Set(knownTexts.flatMap(splitIntoSearchWords))

  return [...new Set(normalizeKeywords(keywords))].filter((keyword) => {
    return splitIntoSearchWords(keyword).some((word) => {
      return !knownWords.has(word)
    })
  })
}
