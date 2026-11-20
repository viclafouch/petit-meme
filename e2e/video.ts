import type { Locator } from '@playwright/test'

export const readVideoIsPaused = (video: Locator) => {
  return video.evaluate((element: HTMLVideoElement) => {
    return element.paused
  })
}

export const readVideoIsMuted = (video: Locator) => {
  return video.evaluate((element: HTMLVideoElement) => {
    return element.muted
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
