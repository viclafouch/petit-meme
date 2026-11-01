import { stat } from 'node:fs/promises'
import { type Download, expect } from '@playwright/test'

export const expectDownloadIsNotEmpty = async (download: Download) => {
  const { size } = await stat(await download.path())

  expect(size).toBeGreaterThan(0)
}

type ExpectMemeFileDownloadedParams = {
  download: Download
  fileName: string
}

export const expectMemeFileDownloaded = async ({
  download,
  fileName
}: ExpectMemeFileDownloadedParams) => {
  expect(download.suggestedFilename()).toBe(fileName)
  await expectDownloadIsNotEmpty(download)
}
