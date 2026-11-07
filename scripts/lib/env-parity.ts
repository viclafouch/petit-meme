import type { z } from 'zod'

const TOOLING_KEYS = new Set(['TZ', 'DIRECT_URL', 'PORT', 'E2E_VIDEO_BUNNY_ID'])

const VERCEL_SYSTEM_KEY = /^VERCEL(?:_|$)/u

type CompareEnvKeysParams = {
  schema: Record<string, z.ZodType>
  sourceKeys: readonly string[]
}

const matchIsKnownOutsideSchema = (key: string) => {
  return TOOLING_KEYS.has(key) || VERCEL_SYSTEM_KEY.test(key)
}

const matchIsRequired = (keySchema: z.ZodType) => {
  // oxlint-disable-next-line unicorn/no-useless-undefined -- undefined stands for the absent key, safeParse() without it fails to typecheck
  return !keySchema.safeParse(undefined).success
}

export const compareEnvKeys = ({
  schema,
  sourceKeys
}: CompareEnvKeysParams) => {
  const present = new Set(sourceKeys)
  const missing = Object.entries(schema)
    .filter(([key, keySchema]) => {
      return matchIsRequired(keySchema) && !present.has(key)
    })
    .map(([key]) => {
      return key
    })

  const extra = sourceKeys.filter((key) => {
    return !Object.hasOwn(schema, key) && !matchIsKnownOutsideSchema(key)
  })

  return { missing, extra }
}

const VERCEL_ENV_ROW = /^ (?<name>[A-Z][A-Z0-9_]*) {2,}/u

export const parseVercelEnvList = (output: string) => {
  const names = output.split('\n').flatMap((line) => {
    const name = VERCEL_ENV_ROW.exec(line)?.groups?.name

    return name === undefined ? [] : [name]
  })

  return [...new Set(names)]
}
