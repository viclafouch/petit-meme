import { stat } from 'node:fs/promises'
import { type Download, expect } from '@playwright/test'

export const expectDownloadIsNotEmpty = async (download: Download) => {
  const { size } = await stat(await download.path())

  expect(size).toBeGreaterThan(0)
}
