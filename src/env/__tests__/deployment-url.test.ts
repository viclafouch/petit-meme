import { describe, expect, it } from 'vitest'
import {
  applyDeploymentSiteUrl,
  resolveTrustedOrigins
} from '~/env/deployment-url'

const PRODUCTION_SITE_URL = 'https://www.petit-meme.io'
const BRANCH_HOSTNAME = 'petit-meme-git-198-isolate-team.vercel.app'
const DEPLOYMENT_HOSTNAME = 'petit-meme-abc123-team.vercel.app'

const readAppliedSiteUrl = (environment: Record<string, string>) => {
  const appliedEnvironment = { ...environment }

  applyDeploymentSiteUrl(appliedEnvironment)

  return appliedEnvironment.VITE_SITE_URL
}

describe('applyDeploymentSiteUrl', () => {
  it('should keep the declared site URL in production', () => {
    expect(
      readAppliedSiteUrl({
        VERCEL_ENV: 'production',
        VERCEL_BRANCH_URL: BRANCH_HOSTNAME,
        VERCEL_URL: DEPLOYMENT_HOSTNAME,
        VITE_SITE_URL: PRODUCTION_SITE_URL
      })
    ).toBe(PRODUCTION_SITE_URL)
  })

  it('should keep the declared site URL outside Vercel', () => {
    expect(readAppliedSiteUrl({ VITE_SITE_URL: 'http://localhost:3000' })).toBe(
      'http://localhost:3000'
    )
  })

  it('should write the branch URL on a preview', () => {
    expect(
      readAppliedSiteUrl({
        VERCEL_ENV: 'preview',
        VERCEL_BRANCH_URL: BRANCH_HOSTNAME,
        VERCEL_URL: DEPLOYMENT_HOSTNAME
      })
    ).toBe(`https://${BRANCH_HOSTNAME}`)
  })

  it('should write the deployment URL on a preview without a branch', () => {
    expect(
      readAppliedSiteUrl({
        VERCEL_ENV: 'preview',
        VERCEL_URL: DEPLOYMENT_HOSTNAME
      })
    ).toBe(`https://${DEPLOYMENT_HOSTNAME}`)
  })

  it('should replace a production site URL left on a preview', () => {
    expect(
      readAppliedSiteUrl({
        VERCEL_ENV: 'preview',
        VERCEL_BRANCH_URL: BRANCH_HOSTNAME,
        VITE_SITE_URL: PRODUCTION_SITE_URL
      })
    ).toBe(`https://${BRANCH_HOSTNAME}`)
  })

  it('should leave an environment without any site URL untouched', () => {
    const environment = {}

    applyDeploymentSiteUrl(environment)

    expect(environment).toStrictEqual({})
  })
})

describe('resolveTrustedOrigins', () => {
  it('should trust the site URL alone in production', () => {
    expect(
      resolveTrustedOrigins({
        VERCEL_ENV: 'production',
        VERCEL_URL: DEPLOYMENT_HOSTNAME,
        VITE_SITE_URL: PRODUCTION_SITE_URL
      })
    ).toStrictEqual([PRODUCTION_SITE_URL])
  })

  it('should trust both the branch and the deployment URL on a preview', () => {
    expect(
      resolveTrustedOrigins({
        VERCEL_ENV: 'preview',
        VERCEL_BRANCH_URL: BRANCH_HOSTNAME,
        VERCEL_URL: DEPLOYMENT_HOSTNAME
      })
    ).toStrictEqual([
      `https://${BRANCH_HOSTNAME}`,
      `https://${DEPLOYMENT_HOSTNAME}`
    ])
  })
})
