/* oxlint-disable no-console */
import type { SupportedLanguage } from '@algolia/client-search'
import {
  getAlgoliaAdminClient,
  algoliaIndexPrefix,
  resolveAlgoliaIndexName,
  resolveAlgoliaReplicaCreated,
  resolveAlgoliaReplicaPopular,
  resolveAlgoliaReplicaRecent
} from '~/lib/algolia'
import { locales, type Locale } from '~/paraglide/runtime'
import { logEnvironmentInfo } from './lib/env-guard'

const INDEX_LANGUAGES = {
  fr: ['fr', 'en'],
  en: ['en']
} as const satisfies Record<Locale, readonly SupportedLanguage[]>

const BASE_INDEX_SETTINGS = {
  searchableAttributes: [
    'title',
    'description',
    'keywords',
    'categoryTitles',
    'categoryKeywords'
  ],
  attributesForFaceting: [
    'filterOnly(status)',
    'searchable(categorySlugs)',
    'filterOnly(publishedAtTime)',
    'filterOnly(contentLocale)'
  ],
  customRanking: [
    'desc(viewCount)',
    'desc(shareCount)',
    'desc(downloadCount)',
    'desc(publishedAtTime)'
  ]
}

type ReplicaConfig = {
  name: string
  customRanking: string[]
}

const buildReplicaConfigs = (locale: Locale): ReplicaConfig[] => {
  return [
    {
      name: resolveAlgoliaReplicaPopular(locale),
      customRanking: [
        'desc(viewCount)',
        'desc(shareCount)',
        'desc(downloadCount)'
      ]
    },
    {
      name: resolveAlgoliaReplicaRecent(locale),
      customRanking: ['desc(publishedAtTime)']
    },
    {
      name: resolveAlgoliaReplicaCreated(locale),
      customRanking: ['desc(createdAtTime)']
    }
  ]
}

const configureReplica = async (replica: ReplicaConfig) => {
  console.log(`  Configuring replica: ${replica.name}`)

  const replicaResponse = await getAlgoliaAdminClient().setSettings({
    indexName: replica.name,
    indexSettings: {
      attributesForFaceting: BASE_INDEX_SETTINGS.attributesForFaceting,
      customRanking: replica.customRanking
    }
  })

  await getAlgoliaAdminClient().waitForTask({
    indexName: replica.name,
    taskID: replicaResponse.taskID
  })

  console.log(`    Done`)
}

const configureLocaleIndices = async (locale: Locale) => {
  const indexName = resolveAlgoliaIndexName(locale)
  const languages = [...INDEX_LANGUAGES[locale]]
  const replicaConfigs = buildReplicaConfigs(locale)

  const replicas = replicaConfigs.map(({ name }) => {
    return name
  })

  console.log(`\nConfiguring primary index: ${indexName}`)
  console.log(`  Languages: ${languages.join(', ')}`)
  console.log(`  Replicas: ${replicas.join(', ')}`)

  const { taskID } = await getAlgoliaAdminClient().setSettings({
    indexName,
    indexSettings: {
      ...BASE_INDEX_SETTINGS,
      queryLanguages: languages,
      indexLanguages: languages,
      ignorePlurals: languages,
      removeStopWords: languages,
      replicas
    }
  })

  await getAlgoliaAdminClient().waitForTask({ indexName, taskID })
  console.log(`  Primary index configured`)

  for (const replica of replicaConfigs) {
    // oxlint-disable-next-line no-await-in-loop -- Algolia applies the replicas one after the other, after their primary exists
    await configureReplica(replica)
  }
}

const setupAlgoliaIndices = async () => {
  logEnvironmentInfo()

  for (const locale of locales) {
    // oxlint-disable-next-line no-await-in-loop -- the locales run one after the other so the logs stay readable and the task queue stays small
    await configureLocaleIndices(locale)
  }

  const mode = import.meta.env.MODE

  console.log('\nAll indices configured successfully!')
  console.log('\nNext steps:')
  console.log(
    `1. Run reindex: pnpm exec vite-node --mode ${mode} scripts/reindex-memes.ts`
  )
  console.log(
    `2. Delete old index "${algoliaIndexPrefix}" and its replicas from Algolia dashboard`
  )

  process.exit(0)
}

void setupAlgoliaIndices()
