import React from 'react'
import { Maximize, Play, Volume2, VolumeX } from 'lucide-react'
import {
  MediaActionTypes,
  useMediaDispatch,
  useMediaSelector
} from 'media-chrome/react/media-store'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { pluralize } from '@/helpers/format'

const OVERLAY_BUTTON_CLASS =
  'rounded-full bg-black/50 hover:bg-black/70 text-white size-9 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50'

const formatVideoDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

const RemainingTimeBadge = () => {
  const duration = useMediaSelector((state) => {
    return state.mediaDuration
  })
  const currentTime = useMediaSelector((state) => {
    return state.mediaCurrentTime
  })

  const hasTimeData = duration !== undefined && currentTime !== undefined
  const remainingTime = hasTimeData ? duration - currentTime : 0

  if (remainingTime <= 0) {
    // eslint-disable-next-line react/jsx-no-useless-fragment -- perf: isolated component to avoid re-rendering parent on every frame
    return <></>
  }

  return (
    <span
      className="absolute bottom-3 left-3 text-xs font-medium text-white bg-black/50 rounded-md px-2 py-1"
      aria-label={`${Math.floor(remainingTime / 60)} ${pluralize(Math.floor(remainingTime / 60), { one: 'minute', other: 'minutes' })} ${Math.floor(remainingTime % 60)} ${pluralize(Math.floor(remainingTime % 60), { one: 'seconde', other: 'secondes' })} restantes`}
    >
      {formatVideoDuration(remainingTime)}
    </span>
  )
}

type VideoOverlayParams = {
  showRemainingTime?: boolean
}

export const VideoOverlay = ({
  showRemainingTime = false
}: VideoOverlayParams) => {
  const dispatch = useMediaDispatch()
  const isPaused = useMediaSelector((state) => {
    return state.mediaPaused
  })
  const isFullscreen = useMediaSelector((state) => {
    return state.mediaIsFullscreen
  })
  const isMuted = useMediaSelector((state) => {
    return state.mediaMuted
  })

  const handleOverlayClick = () => {
    dispatch({
      type: isPaused
        ? MediaActionTypes.MEDIA_PLAY_REQUEST
        : MediaActionTypes.MEDIA_PAUSE_REQUEST
    })
  }

  const handleFullscreenClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation()
    dispatch({
      type: isFullscreen
        ? MediaActionTypes.MEDIA_EXIT_FULLSCREEN_REQUEST
        : MediaActionTypes.MEDIA_ENTER_FULLSCREEN_REQUEST
    })
  }

  const handleMuteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    dispatch({
      type: isMuted
        ? MediaActionTypes.MEDIA_UNMUTE_REQUEST
        : MediaActionTypes.MEDIA_MUTE_REQUEST
    })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOverlayClick()
    }
  }

  const fullscreenLabel = isFullscreen
    ? 'Quitter le plein écran'
    : 'Plein écran'
  const muteLabel = isMuted ? 'Activer le son' : 'Couper le son'

  return (
    <div
      className="absolute inset-0 flex items-center justify-center cursor-pointer z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={isPaused ? 'Lire la vidéo' : 'Mettre en pause'}
    >
      {isPaused ? (
        <div className="size-16 rounded-full bg-black/50 flex items-center justify-center">
          <Play className="size-8 text-white fill-white ml-1" />
        </div>
      ) : null}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={OVERLAY_BUTTON_CLASS}
              onClick={handleFullscreenClick}
              aria-label={fullscreenLabel}
            >
              <Maximize className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{fullscreenLabel}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={OVERLAY_BUTTON_CLASS}
              onClick={handleMuteClick}
              aria-label={muteLabel}
            >
              {isMuted ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{muteLabel}</TooltipContent>
        </Tooltip>
      </div>
      {showRemainingTime ? <RemainingTimeBadge /> : null}
    </div>
  )
}
