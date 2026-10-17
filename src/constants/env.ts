// oxlint-disable-next-line node/no-process-env -- Vite inlines this exact expression in the client bundle, a destructured read would reach the browser as is
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
// oxlint-disable-next-line node/no-process-env -- Vite inlines this exact expression in the client bundle, a destructured read would reach the browser as is
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
