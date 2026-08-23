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

// The Web Share API is the one thing a runner cannot answer: the sheet belongs
// to the operating system. `navigator.share` is undefined in the WebKit
// Playwright ships, exactly as it is on a desktop browser, so the button would
// throw instead of sharing. The stub takes its place and writes down what the
// page handed over, which is the whole of what the site is responsible for.
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

// The share only reaches the stub once the server has proxied the whole file
// from Bunny, which takes seconds rather than milliseconds.
const SHARE_GIVE_UP_MS = 15_000

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
      { timeout: SHARE_GIVE_UP_MS }
    )
    .toEqual([{ title, fileName: `${title}.mp4`, isEmpty: false }])
}
