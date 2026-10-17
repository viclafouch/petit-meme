type ProcessEnvironment = {
  DATABASE_URL?: string
  LOG_LEVEL?: string
}

// oxlint-disable-next-line node/no-process-env -- the single live reader of the raw environment, for the modules that load before the validated server env
export const processEnvironment: ProcessEnvironment = process.env
