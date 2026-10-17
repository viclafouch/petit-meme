type ProcessEnvironment = {
  DATABASE_URL?: string
  LOG_LEVEL?: string
  VERCEL_ENV?: string
  VITE_SENTRY_DSN?: string
}

// oxlint-disable-next-line node/no-process-env -- the single live reader of the raw environment, for the modules that load before the validated server env
export const processEnvironment: ProcessEnvironment = process.env
