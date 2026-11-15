import React from 'react'

type ReelProgressProps = {
  video: HTMLVideoElement | null
}

const IS_VIDEO_FRAME_CALLBACK_SUPPORTED =
  typeof HTMLVideoElement !== 'undefined' &&
  'requestVideoFrameCallback' in HTMLVideoElement.prototype

type FollowProgressParams = {
  video: HTMLVideoElement
  onProgress: (time: number) => void
}

const followPresentedFrames = ({ video, onProgress }: FollowProgressParams) => {
  let frameRequestId = 0

  const followPresentedFrame: VideoFrameRequestCallback = (
    _now,
    { mediaTime }
  ) => {
    onProgress(mediaTime)
    frameRequestId = video.requestVideoFrameCallback(followPresentedFrame)
  }

  frameRequestId = video.requestVideoFrameCallback(followPresentedFrame)

  return () => {
    video.cancelVideoFrameCallback(frameRequestId)
  }
}

const followAnimationFrames = ({ video, onProgress }: FollowProgressParams) => {
  let frameRequestId = 0

  const followAnimationFrame = () => {
    onProgress(video.currentTime)
    frameRequestId = requestAnimationFrame(followAnimationFrame)
  }

  frameRequestId = requestAnimationFrame(followAnimationFrame)

  return () => {
    cancelAnimationFrame(frameRequestId)
  }
}

export const ReelProgress = ({ video }: ReelProgressProps) => {
  const barRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const bar = barRef.current

    if (!video || !bar) {
      return () => {}
    }

    const followProgress = IS_VIDEO_FRAME_CALLBACK_SUPPORTED
      ? followPresentedFrames
      : followAnimationFrames

    return followProgress({
      video,
      onProgress: (time) => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          bar.style.scale = `${time / video.duration} 1`
        }
      }
    })
  }, [video])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/20"
    >
      <div
        ref={barRef}
        className="size-full origin-left bg-white [scale:0_1]"
      />
    </div>
  )
}
