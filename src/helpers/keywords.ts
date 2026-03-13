export function parseKeywordsInput(input: string) {
  return input
    .split(',')
    .map((keyword) => {
      return keyword.trim().toLowerCase()
    })
    .filter(Boolean)
}
