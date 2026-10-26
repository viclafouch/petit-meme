import { Button } from '~/components/ui/button'
import { m } from '~/paraglide/messages.js'

type VideoPlaybackErrorProps = {
  onRetry: () => void
}

export const VideoPlaybackError = ({ onRetry }: VideoPlaybackErrorProps) => {
  return (
    <div
      role="alert"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center text-white"
    >
      <p className="text-sm">{m.meme_video_playback_error()}</p>
      <Button variant="secondary" onClick={onRetry}>
        {m.common_retry()}
      </Button>
    </div>
  )
}
