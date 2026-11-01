import { expect, type Page } from '@playwright/test'
import type { MemeDerivedFormat } from '~/constants/bunny'

type RecordedShare = {
  title: string
  fileName: string
  isEmpty: boolean
}

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- widening the DOM `Window` is declaration merging, which only an interface does
  interface Window {
    e2eRecordedShares: RecordedShare[]
  }
}

type RecordSharesParams = {
  page: Page
  isFileShareable?: boolean
}

export const recordShares = async ({
  page,
  isFileShareable = true
}: RecordSharesParams) => {
  await page.addInitScript((isShareable) => {
    window.e2eRecordedShares = []

    navigator.canShare = () => {
      return isShareable
    }

    navigator.share = async (data) => {
      const [file] = data?.files ?? []

      window.e2eRecordedShares = [
        ...window.e2eRecordedShares,
        {
          title: data?.title ?? '',
          fileName: file?.name ?? '',
          isEmpty: (file?.size ?? 0) === 0
        }
      ]
    }
  }, isFileShareable)
}

type ExpectFileWasSharedParams = {
  page: Page
  title: string
  format: MemeDerivedFormat
}

const WHOLE_FILE_PROXY_GIVE_UP_MS = 15_000

export const expectFileWasShared = async ({
  page,
  title,
  format
}: ExpectFileWasSharedParams) => {
  await expect
    .poll(
      () => {
        return page.evaluate(() => {
          return window.e2eRecordedShares
        })
      },
      { timeout: WHOLE_FILE_PROXY_GIVE_UP_MS }
    )
    .toStrictEqual([{ title, fileName: `${title}.${format}`, isEmpty: false }])
}
