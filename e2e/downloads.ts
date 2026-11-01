import { stat } from 'node:fs/promises'
import path from 'node:path'
import { type Download, expect } from '@playwright/test'
import type { MemeDerivedFormat } from '~/constants/bunny'

export const expectDownloadIsNotEmpty = async (download: Download) => {
  const { size } = await stat(await download.path())

  expect(size).toBeGreaterThan(0)
}

type ExpectMemeFileDownloadedParams = {
  download: Download
  format: MemeDerivedFormat
}

export const expectMemeFileDownloaded = async ({
  download,
  format
}: ExpectMemeFileDownloadedParams) => {
  expect(path.extname(download.suggestedFilename())).toBe(`.${format}`)
  await expectDownloadIsNotEmpty(download)
}
