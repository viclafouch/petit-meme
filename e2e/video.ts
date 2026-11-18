import type { Locator } from '@playwright/test'

export const readVideoIsPaused = (video: Locator) => {
  return video.evaluate((element: HTMLVideoElement) => {
    return element.paused
  })
}

export const readVideoCurrentTime = (video: Locator) => {
  return video.evaluate((element: HTMLVideoElement) => {
    return element.currentTime
  })
}

export const readVideoDuration = (video: Locator) => {
  return video.evaluate((element: HTMLVideoElement) => {
    return element.duration
  })
}
