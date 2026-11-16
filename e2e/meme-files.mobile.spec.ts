import path from 'node:path'
import { expect, type Page } from '@playwright/test'
import {
  MEME_STORED_FILE_CONTENT_TYPES,
  type MemeDerivedFormat
} from '~/constants/bunny'
import type { MemeExportMode } from '~/constants/meme'
import { m } from '~/paraglide/messages'
import { E2E_NAMED_MEMES } from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import { readDownloadedFile, readOriginalVideoDigest } from './meme-files'
import { readShareAttempt, recordShares } from './share'

const EXPORTED_MEME = E2E_NAMED_MEMES.mostViewed
const EXPORTED_MEME_PATHNAME = `/memes/${EXPORTED_MEME.id}`

const VISITOR_STORAGE_STATE = { cookies: [], origins: [] }

const AUDIENCES = [
  {
    name: 'a Visitor',
    storageState: VISITOR_STORAGE_STATE,
    isPremium: false
  },
  {
    name: 'a free User',
    storageState: resolveStorageStatePath('free'),
    isPremium: false
  },
  {
    name: 'a Premium',
    storageState: resolveStorageStatePath('premium'),
    isPremium: true
  }
] as const

const EXPORT_MODES = [
  'download',
  'share'
] as const satisfies readonly MemeExportMode[]

const TRIGGER_NAMES = {
  download: m.meme_download,
  share: m.meme_share
} as const satisfies Record<MemeExportMode, () => string>

const PANEL_NAMES = {
  download: m.meme_download,
  share: m.meme_share_heading
} as const satisfies Record<MemeExportMode, () => string>

const UPSELL_TITLES = {
  download: m.audio_upsell_title_download,
  share: m.audio_upsell_title_share
} as const satisfies Record<MemeExportMode, () => string>

const MODE_VERBS = {
  download: 'downloads',
  share: 'shares'
} as const satisfies Record<MemeExportMode, string>

const FORMAT_LABELS = {
  download: { mp4: m.meme_download_video, mp3: m.meme_export_sound_only },
  share: { mp4: m.meme_share_video, mp3: m.meme_export_sound_only }
} as const satisfies Record<
  MemeExportMode,
  Record<MemeDerivedFormat, () => string>
>

type VideoQuality = 'original' | 'watermarked'

const QUALITY_CHECKS = {
  original: (sha256: string, originalSha256: string) => {
    expect(sha256).toBe(originalSha256)
  },
  watermarked: (sha256: string, originalSha256: string) => {
    expect(sha256).not.toBe(originalSha256)
  }
} as const satisfies Record<
  VideoQuality,
  (sha256: string, originalSha256: string) => void
>

const pickFormat = async (
  page: Page,
  mode: MemeExportMode,
  format: MemeDerivedFormat
) => {
  const formatTile = page
    .getByRole('dialog', { name: PANEL_NAMES[mode]() })
    .getByRole('button', { name: FORMAT_LABELS[mode][format]() })

  await repeatUntilVisible(() => {
    return page
      .getByRole('button', { name: TRIGGER_NAMES[mode](), exact: true })
      .click()
  }, formatTile)

  await formatTile.click()
}

const DELIVERIES = {
  download: async (page: Page, format: MemeDerivedFormat) => {
    const downloadPromise = page.waitForEvent('download')

    await pickFormat(page, 'download', format)

    return readDownloadedFile(await downloadPromise)
  },
  share: async (page: Page, format: MemeDerivedFormat) => {
    await pickFormat(page, 'share', format)

    const { title, type, fileName, ...sharedFile } =
      await readShareAttempt(page)

    expect({ title, type, fileName }).toStrictEqual({
      title: EXPORTED_MEME.title,
      type: MEME_STORED_FILE_CONTENT_TYPES[format],
      fileName: `${EXPORTED_MEME.title}.${format}`
    })

    return { extension: path.extname(fileName), ...sharedFile }
  }
} as const satisfies Record<
  MemeExportMode,
  (
    page: Page,
    format: MemeDerivedFormat
  ) => Promise<{ extension: string; sha256: string; isEmpty: boolean }>
>

const buildExpectedFile = (format: MemeDerivedFormat) => {
  return {
    extension: `.${format}`,
    sha256: expect.any(String),
    isEmpty: false
  }
}

for (const audience of AUDIENCES) {
  const videoQuality: VideoQuality = audience.isPremium
    ? 'original'
    : 'watermarked'

  test.describe(`the Meme files of ${audience.name}`, () => {
    test.use({ storageState: audience.storageState })

    test.beforeEach(async ({ page }) => {
      await recordShares({ page })
      await page.goto(EXPORTED_MEME_PATHNAME)
    })

    for (const mode of EXPORT_MODES) {
      test(`${MODE_VERBS[mode]} the ${videoQuality} video as an MP4`, async ({
        page
      }) => {
        const file = await DELIVERIES[mode](page, 'mp4')

        expect(file).toStrictEqual(buildExpectedFile('mp4'))
        QUALITY_CHECKS[videoQuality](
          file.sha256,
          await readOriginalVideoDigest()
        )
      })

      if (audience.isPremium) {
        test(`${MODE_VERBS[mode]} the sound as an MP3`, async ({ page }) => {
          const file = await DELIVERIES[mode](page, 'mp3')

          expect(file).toStrictEqual(buildExpectedFile('mp3'))
        })
      } else {
        test(`is offered Premium when it ${MODE_VERBS[mode]} the sound`, async ({
          page
        }) => {
          await pickFormat(page, mode, 'mp3')

          await expect(
            page.getByRole('dialog', { name: UPSELL_TITLES[mode]() })
          ).toBeVisible()
        })
      }
    }
  })
}
