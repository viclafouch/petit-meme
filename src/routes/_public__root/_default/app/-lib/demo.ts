const DEMO_ASSET_DIRECTORY = '/images/app'

export const DEMO_ASSET_PATHS = {
  messagingAppsSprite: `${DEMO_ASSET_DIRECTORY}/messaging-apps.svg`,
  sharedMeme: `${DEMO_ASSET_DIRECTORY}/tony-stark-exhausted.webp`,
  reelMeme: `${DEMO_ASSET_DIRECTORY}/mads-mikkelsen-at-cannes.webp`,
  relatedMeme: `${DEMO_ASSET_DIRECTORY}/philippe-etchebest.webp`,
  watermark: `${DEMO_ASSET_DIRECTORY}/watermark.webp`
} as const

export const DEMO_CLOCK = {
  iphone: '9:41',
  android: '12:30'
} as const
