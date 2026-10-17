/* oxlint-disable no-console */

const getHost = (url: string) => {
  try {
    const { hostname } = new URL(url)

    return hostname
  } catch {
    return 'unknown'
  }
}

export const logEnvironmentInfo = () => {
  // oxlint-disable-next-line node/no-process-env -- the scripts' guard prints the raw environment a script is about to touch
  const processEnvironment = process.env
  const dbHost = getHost(processEnvironment.DATABASE_URL ?? '')
  const algoliaIndex = processEnvironment.VITE_ALGOLIA_INDEX ?? 'unknown'
  const bunnyLibraryId = processEnvironment.VITE_BUNNY_LIBRARY_ID ?? 'unknown'
  const siteUrl = processEnvironment.VITE_SITE_URL ?? 'unknown'

  console.log(`Site URL:        ${siteUrl}`)
  console.log(`Database:        ${dbHost}`)
  console.log(`Algolia index:   ${algoliaIndex}`)
  console.log(`Bunny library:   ${bunnyLibraryId}\n`)

  return { dbHost, algoliaIndex, bunnyLibraryId, siteUrl }
}
