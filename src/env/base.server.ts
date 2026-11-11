import { createEnv } from '@t3-oss/env-core'
import { vercel } from '@t3-oss/env-core/presets-zod'
import { IS_TEST } from '../constants/env'
import { baseEnvSchema } from './server-schema.server'

export const baseEnv = createEnv({
  server: baseEnvSchema,
  extends: [vercel()],
  // oxlint-disable-next-line node/no-process-env -- the env read by the modules that load before the full server env, such as Sentry and the logger
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: IS_TEST
})
