import type { Meme } from '~/db/generated/prisma/client'

const SNAPSHOT_MAX_WIDTH = 960

const SNAPSHOT_QUALITY = 0.82

type ReelSnapshot = {
  memeId: Meme['id']
  imageUrl: string | null
  resumeTime: number | null
}

let lastSnapshot: ReelSnapshot | null = null

const replaceSnapshot = (snapshot: ReelSnapshot | null) => {
  if (lastSnapshot?.imageUrl) {
    URL.revokeObjectURL(lastSnapshot.imageUrl)
  }

  lastSnapshot = snapshot
}

const drawVideoFrame = (video: HTMLVideoElement) => {
  const scale = Math.min(1, SNAPSHOT_MAX_WIDTH / video.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)

  return canvas
}

export const takeReelSnapshot = (
  memeId: Meme['id'],
  video: HTMLVideoElement
) => {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return
  }

  const snapshot: ReelSnapshot = {
    memeId,
    imageUrl: null,
    resumeTime: video.currentTime
  }

  replaceSnapshot(snapshot)

  try {
    drawVideoFrame(video).toBlob(
      (blob) => {
        if (blob && lastSnapshot === snapshot) {
          snapshot.imageUrl = URL.createObjectURL(blob)
        }
      },
      'image/jpeg',
      SNAPSHOT_QUALITY
    )
  } catch {
    snapshot.imageUrl = null
  }
}

export const findReelSnapshotImage = (memeId: Meme['id']) => {
  return lastSnapshot?.memeId === memeId ? lastSnapshot.imageUrl : null
}

export const takeReelResumeTime = (memeId: Meme['id']) => {
  if (lastSnapshot?.memeId !== memeId) {
    return null
  }

  const { resumeTime } = lastSnapshot
  lastSnapshot.resumeTime = null

  return resumeTime
}
