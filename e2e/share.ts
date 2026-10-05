import { expect, type Page } from '@playwright/test'

export type RecordedShare = {
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

export const recordShares = async (page: Page) => {
  await page.addInitScript(() => {
    window.e2eRecordedShares = []

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
  })
}

type ExpectVideoWasSharedParams = {
  page: Page
  title: string
}

const WHOLE_FILE_PROXY_GIVE_UP_MS = 15_000

export const expectVideoWasShared = async ({
  page,
  title
}: ExpectVideoWasSharedParams) => {
  await expect
    .poll(
      () => {
        return page.evaluate(() => {
          return window.e2eRecordedShares
        })
      },
      { timeout: WHOLE_FILE_PROXY_GIVE_UP_MS }
    )
    .toEqual([{ title, fileName: `${title}.mp4`, isEmpty: false }])
}
