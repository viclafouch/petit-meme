import React from 'react'

type ReelProgressProps = {
  video: HTMLVideoElement | null
}

export const ReelProgress = ({ video }: ReelProgressProps) => {
  const barRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const bar = barRef.current

    if (!video || !bar) {
      return () => {}
    }

    let frameRequestId = 0

    const followPresentedFrame: VideoFrameRequestCallback = (
      _now,
      { mediaTime }
    ) => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        bar.style.transform = `scaleX(${mediaTime / video.duration})`
      }

      frameRequestId = video.requestVideoFrameCallback(followPresentedFrame)
    }

    frameRequestId = video.requestVideoFrameCallback(followPresentedFrame)

    return () => {
      video.cancelVideoFrameCallback(frameRequestId)
    }
  }, [video])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/20"
    >
      <div
        ref={barRef}
        className="size-full origin-left bg-white [transform:scaleX(0)]"
      />
    </div>
  )
}
