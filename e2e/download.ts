import { stat } from 'node:fs/promises'
import { expect, type Download } from '@playwright/test'

// A download that lands as an empty file is a download that failed, and the
// event alone would not say so.
export const expectDownloadIsNotEmpty = async (download: Download) => {
  const { size } = await stat(await download.path())

  expect(size).toBeGreaterThan(0)
}
