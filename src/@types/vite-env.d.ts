/// <reference types="vite/client" />

// oxlint-disable-next-line typescript/consistent-type-definitions -- Vite reads this option through interface merging, a type alias cannot merge
interface ViteTypeOptions {
  strictImportMetaEnv: unknown
}

// oxlint-disable-next-line typescript/consistent-type-definitions -- Vite types import.meta.env through interface merging, a type alias cannot merge
interface ImportMetaEnv {
  readonly VITE_SITE_URL: string | undefined
  readonly VITE_BUNNY_HOSTNAME: string | undefined
  readonly VITE_BUNNY_IMAGES_HOSTNAME: string | undefined
  readonly VITE_ALGOLIA_APP_ID: string | undefined
  readonly VITE_ALGOLIA_INSIGHTS_KEY: string | undefined
  readonly VITE_ALGOLIA_INDEX: string | undefined
  readonly VITE_SENTRY_DSN: string | undefined
  readonly VITE_VERCEL_ENV: string | undefined
}

// oxlint-disable-next-line typescript/consistent-type-definitions -- Vite types import.meta.env through interface merging, a type alias cannot merge
interface ImportMeta {
  readonly env: ImportMetaEnv
}
