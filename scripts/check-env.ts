import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import { z } from 'zod'
import { clientEnvSchema } from '../src/env/client-schema.ts'
import {
  baseEnvSchema,
  serverEnvSchema
} from '../src/env/server-schema.server.ts'
import { compareEnvKeys, parseVercelEnvList } from './lib/env-parity.ts'

const ENV_SCHEMA = { ...baseEnvSchema, ...serverEnvSchema, ...clientEnvSchema }

const VERCEL_PRODUCTION_ENV_SCHEMA = {
  ...ENV_SCHEMA,
  CRON_SECRET: z.string(),
  BLOB_STORE_ID: z.string()
}

const {
  VITE_SITE_URL: _siteUrlDerivedFromBranchUrl,
  ...VERCEL_PREVIEW_ENV_SCHEMA
} = VERCEL_PRODUCTION_ENV_SCHEMA

const LOCAL_ENV_FILES = ['.env.development', '.env.e2e', '.env.preview']

type EnvSchema = Record<string, z.ZodType>

type VercelTarget = {
  target: string
  schema: EnvSchema
}

const VERCEL_TARGETS = [
  { target: 'production', schema: VERCEL_PRODUCTION_ENV_SCHEMA },
  { target: 'preview', schema: VERCEL_PREVIEW_ENV_SCHEMA }
] as const satisfies readonly VercelTarget[]

type EnvSource = {
  name: string
  schema: EnvSchema
  readKeys: () => string[]
}

const fromEnvFile = (path: string): EnvSource => {
  return {
    name: path,
    schema: ENV_SCHEMA,
    readKeys: () => {
      if (!existsSync(path)) {
        throw new Error(`${path} is missing`)
      }

      return Object.keys(dotenv.parse(readFileSync(path)))
    }
  }
}

const fromVercelTarget = ({ target, schema }: VercelTarget): EnvSource => {
  return {
    name: `Vercel ${target}`,
    schema,
    readKeys: () => {
      return parseVercelEnvList(
        execFileSync('vercel', ['env', 'ls', target], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        })
      )
    }
  }
}

// oxlint-disable-next-line node/no-process-env -- the env check reads the CI flag that GitHub Actions sets, CI holds no local env file and no Vercel access
const isCi = Boolean(process.env.CI)

const sources = [
  fromEnvFile('.env.example'),
  ...(isCi
    ? []
    : [
        ...LOCAL_ENV_FILES.map(fromEnvFile),
        ...VERCEL_TARGETS.map(fromVercelTarget)
      ])
]

const reports = sources.map((source) => {
  const { missing, extra } = compareEnvKeys({
    schema: source.schema,
    sourceKeys: source.readKeys()
  })

  return {
    name: source.name,
    missing,
    extra,
    isAligned: missing.length === 0 && extra.length === 0
  }
})

for (const { name, missing, extra, isAligned } of reports) {
  console.log(`${isAligned ? '✓' : '✗'} ${name}`)

  if (missing.length > 0) {
    console.log(`  missing: ${missing.join(', ')}`)
  }

  if (extra.length > 0) {
    console.log(`  extra: ${extra.join(', ')}`)
  }
}

if (
  !reports.every(({ isAligned }) => {
    return isAligned
  })
) {
  process.exitCode = 1
}
