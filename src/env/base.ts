import { z } from 'zod'
import { createEnv } from '@t3-oss/env-core'
import { vercel } from '@t3-oss/env-core/presets-zod'

export const baseEnv = createEnv({
  clientPrefix: 'VITE_',
  client: {},
  shared: {
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .optional()
  },
  extends: [vercel()],
  // oxlint-disable-next-line node/no-process-env -- the env read by the modules that load before the full server env, on the server and in the browser
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
})
