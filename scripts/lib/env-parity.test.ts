import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { compareEnvKeys, parseVercelEnvList } from './env-parity'

const SCHEMA = {
  DATABASE_URL: z.string(),
  VITE_SITE_URL: z.url(),
  EMAIL_OVERRIDE_TO: z.string().optional()
}

describe('compareEnvKeys', () => {
  it('should report a required key the source lacks as missing', () => {
    expect(
      compareEnvKeys({ schema: SCHEMA, sourceKeys: ['VITE_SITE_URL'] })
    ).toStrictEqual({ missing: ['DATABASE_URL'], extra: [] })
  })

  it('should report a retired VITE_ key the source still holds as extra', () => {
    expect(
      compareEnvKeys({
        schema: SCHEMA,
        sourceKeys: ['DATABASE_URL', 'VITE_SITE_URL', 'VITE_ALGOLIA_SEARCH_KEY']
      })
    ).toStrictEqual({ missing: [], extra: ['VITE_ALGOLIA_SEARCH_KEY'] })
  })

  it('should accept tooling keys and the keys Vercel sets on its own', () => {
    expect(
      compareEnvKeys({
        schema: SCHEMA,
        sourceKeys: [
          'DATABASE_URL',
          'VITE_SITE_URL',
          'TZ',
          'DIRECT_URL',
          'PORT',
          'E2E_VIDEO_BUNNY_ID',
          'VERCEL_ENV',
          'VERCEL_OIDC_TOKEN'
        ]
      })
    ).toStrictEqual({ missing: [], extra: [] })
  })
})

const VERCEL_ENV_LIST_OUTPUT = `Vercel CLI 65.9.0
> Environment Variables found for team/petit-meme [773ms]

 name                               value                       type      environments                        created
 BUNNY_LIBRARY_ID                   Hidden                      Secret    Production                          20m ago
 VITE_ALGOLIA_INSIGHTS_KEY          eyJ2IjoidjIiLCJjIj…         Config    Production, Preview                 2h ago
 BUNNY_LIBRARY_ID                   Hidden                      Secret    Preview                             20m ago

Next steps:
- Add an Environment Variable:
  vercel env add --scope team
`

describe('parseVercelEnvList', () => {
  it('should read each variable name once, without its value', () => {
    expect(parseVercelEnvList(VERCEL_ENV_LIST_OUTPUT)).toStrictEqual([
      'BUNNY_LIBRARY_ID',
      'VITE_ALGOLIA_INSIGHTS_KEY'
    ])
  })
})
