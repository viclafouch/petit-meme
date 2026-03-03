/* eslint-disable no-console */

const getHost = (url: string) => {
  try {
    const { hostname } = new URL(url)

    return hostname
  } catch {
    return 'unknown'
  }
}

export const logEnvironmentInfo = () => {
  const dbHost = getHost(process.env.DATABASE_URL ?? '')
  const algoliaIndex = process.env.VITE_ALGOLIA_INDEX ?? 'unknown'
  const bunnyLibraryId = process.env.VITE_BUNNY_LIBRARY_ID ?? 'unknown'
  const siteUrl = process.env.VITE_SITE_URL ?? 'unknown'

  console.log(`Site URL:        ${siteUrl}`)
  console.log(`Database:        ${dbHost}`)
  console.log(`Algolia index:   ${algoliaIndex}`)
  console.log(`Bunny library:   ${bunnyLibraryId}\n`)

  return { dbHost, algoliaIndex, bunnyLibraryId, siteUrl }
}
