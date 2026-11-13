import { ONE_HOUR_IN_SECONDS, SECOND } from '~/constants/time'

export const BUNNY_STATUS = {
  QUEUED: 0,
  PROCESSING: 1,
  ENCODING: 2,
  FINISHED: 3,
  RESOLUTION_FINISHED: 4,
  FAILED: 5,
  PRESIGNED_UPLOAD_STARTED: 6,
  PRESIGNED_UPLOAD_FINISHED: 7,
  PRESIGNED_UPLOAD_FAILED: 8,
  CAPTIONS_GENERATED: 9,
  TITLE_OR_DESCRIPTION_GENERATED: 10,
  VIDEO_DELETED: 32
} as const satisfies Record<string, number>

export const PLAYABLE_BUNNY_STATUSES: readonly number[] = [
  BUNNY_STATUS.FINISHED,
  BUNNY_STATUS.RESOLUTION_FINISHED
]

export const BUNNY_STORAGE_ENDPOINT = 'https://storage.bunnycdn.com'

export const HLS_MIME_TYPE = 'application/vnd.apple.mpegurl'

export const ORIGINAL_ACCESS_HEADER = 'X-Original-Access-Key'

export const MEME_DERIVED_FORMATS = [
  'mp4',
  'mp3'
] as const satisfies readonly string[]

export type MemeDerivedFormat = (typeof MEME_DERIVED_FORMATS)[number]

export const MEME_STORED_FILES = [
  ...MEME_DERIVED_FORMATS,
  'first-frame'
] as const satisfies readonly string[]

export type MemeStoredFile = (typeof MEME_STORED_FILES)[number]

export const MEME_STORED_FILE_CONTENT_TYPES = {
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  'first-frame': 'image/webp'
} as const satisfies Record<MemeStoredFile, string>

export const MEME_FIRST_FRAME_FILE_NAME = 'first-frame.webp'

const PLAYBACK_TOKEN_TTL_HOURS = 6

export const PLAYBACK_TOKEN_TTL_SECONDS =
  PLAYBACK_TOKEN_TTL_HOURS * ONE_HOUR_IN_SECONDS

const CRAWLER_STREAM_EXPIRY_YEAR = 2100

export const CRAWLER_STREAM_EXPIRES_AT =
  Date.UTC(CRAWLER_STREAM_EXPIRY_YEAR, 0, 1) / SECOND
