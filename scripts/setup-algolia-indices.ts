/* eslint-disable no-console, no-await-in-loop */
import {
  algoliaAdminClient,
  algoliaIndexPrefix,
  resolveAlgoliaIndexName,
  resolveAlgoliaReplicaCreated,
  resolveAlgoliaReplicaPopular,
  resolveAlgoliaReplicaRecent
} from '@/lib/algolia'
import type { Locale } from '@/paraglide/runtime'
import { locales } from '@/paraglide/runtime'
import type { SupportedLanguage } from '@algolia/client-search'
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

const setupAlgoliaIndices = async () => {
  logEnvironmentInfo()

  for (const locale of locales) {
    const indexName = resolveAlgoliaIndexName(locale)
    const languages = [...INDEX_LANGUAGES[locale]]
    const replicaConfigs = buildReplicaConfigs(locale)

    const replicas = replicaConfigs.map(({ name }) => {
      return name
    })

    console.log(`\nConfiguring primary index: ${indexName}`)
    console.log(`  Languages: ${languages.join(', ')}`)
    console.log(`  Replicas: ${replicas.join(', ')}`)

    await algoliaAdminClient.setSettings({
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

    console.log(`  Done`)

    for (const replica of replicaConfigs) {
      console.log(`  Configuring replica: ${replica.name}`)

      await algoliaAdminClient.setSettings({
        indexName: replica.name,
        indexSettings: {
          customRanking: replica.customRanking
        }
      })

      console.log(`    Done`)
    }
  }

  const mode = import.meta.env.MODE

  console.log('\nAll indices configured successfully!')
  console.log('\nNext steps:')
  console.log(
    `1. Run reindex: npx vite-node --mode ${mode} scripts/reindex-memes.ts`
  )
  console.log(
    `2. Delete old index "${algoliaIndexPrefix}" and its replicas from Algolia dashboard`
  )

  process.exit(0)
}

void setupAlgoliaIndices()
