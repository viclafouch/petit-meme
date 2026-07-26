import { STAR_SHADOWS } from './og-stars'

/**
 * Changing anything an OG template renders means bumping `OG_VERSION` in
 * `~/lib/seo`: generated images are cached immutably for a year, so already
 * scraped URLs never refetch otherwise.
 */
export const OgBackdrop = () => {
  return (
    <>
      <div
        tw="absolute top-0 left-0"
        style={{
          width: '1px',
          height: '1px',
          backgroundColor: 'transparent',
          borderRadius: '50%',
          boxShadow: STAR_SHADOWS
        }}
      />
      <div
        tw="flex absolute bottom-0 left-0 right-0 h-[4px]"
        style={{
          background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)'
        }}
      />
    </>
  )
}
