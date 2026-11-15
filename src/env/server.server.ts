import { createEnv } from '@t3-oss/env-core'
import { IS_PRODUCTION, IS_TEST } from '../constants/env.ts'
import { baseEnv } from './base.server.ts'
import { clientEnvSchema } from './client-schema.ts'
import { applyDeploymentSiteUrl } from './deployment-url.ts'
import { serverEnvSchema } from './server-schema.server.ts'

// oxlint-disable-next-line node/no-process-env -- the validated server env is the boundary that reads the process environment
const processEnvironment = process.env

applyDeploymentSiteUrl(processEnvironment)

export const serverEnv = createEnv({
  server: serverEnvSchema,
  clientPrefix: 'VITE_',
  client: clientEnvSchema,
  extends: [baseEnv],
  runtimeEnv: processEnvironment,
  emptyStringAsUndefined: true,
  skipValidation: IS_TEST
})

export const matchIsProductionDeployment = () => {
  const { VERCEL_ENV } = serverEnv

  return VERCEL_ENV === undefined ? IS_PRODUCTION : VERCEL_ENV === 'production'
}

export const matchIsDeployed = () => {
  const { VERCEL_ENV } = serverEnv

  return VERCEL_ENV === undefined ? IS_PRODUCTION : VERCEL_ENV !== 'development'
}
