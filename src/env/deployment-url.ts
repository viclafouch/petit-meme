type DeploymentEnvironment = {
  VERCEL_ENV?: string
  VERCEL_BRANCH_URL?: string
  VERCEL_URL?: string
  VITE_SITE_URL?: string
}

const resolvePreviewOrigins = ({
  VERCEL_ENV,
  VERCEL_BRANCH_URL,
  VERCEL_URL
}: DeploymentEnvironment) => {
  if (VERCEL_ENV !== 'preview') {
    return []
  }

  return [VERCEL_BRANCH_URL, VERCEL_URL].flatMap((hostname) => {
    return hostname ? [`https://${hostname}`] : []
  })
}

const resolveSiteUrl = (environment: DeploymentEnvironment) => {
  const [branchOrigin] = resolvePreviewOrigins(environment)

  return branchOrigin ?? environment.VITE_SITE_URL
}

export const resolveTrustedOrigins = (environment: DeploymentEnvironment) => {
  const previewOrigins = resolvePreviewOrigins(environment)

  if (previewOrigins.length > 0) {
    return previewOrigins
  }

  return environment.VITE_SITE_URL ? [environment.VITE_SITE_URL] : []
}

export const applyDeploymentSiteUrl = (environment: DeploymentEnvironment) => {
  const siteUrl = resolveSiteUrl(environment)

  if (siteUrl) {
    environment.VITE_SITE_URL = siteUrl
  }
}
