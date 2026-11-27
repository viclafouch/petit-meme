import type { Plugin } from 'vite'

const PARAGLIDE_URL_PATTERN_POLYFILL =
  '@inlang/paraglide-js/urlpattern-polyfill'

const NATIVE_URL_PATTERN_MODULE = '\0native-url-pattern'

export const nativeUrlPattern = (): Plugin => {
  return {
    name: 'native-url-pattern',
    enforce: 'pre',
    applyToEnvironment: (environment) => {
      return environment.config.consumer === 'client'
    },
    resolveId: {
      filter: { id: new RegExp(`^${PARAGLIDE_URL_PATTERN_POLYFILL}$`, 'u') },
      handler: () => {
        return NATIVE_URL_PATTERN_MODULE
      }
    },
    load: {
      filter: { id: new RegExp(`^${NATIVE_URL_PATTERN_MODULE}$`, 'u') },
      handler: () => {
        return 'export {}'
      }
    }
  }
}
