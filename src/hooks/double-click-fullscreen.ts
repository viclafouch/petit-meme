import {
  MediaActionTypes,
  useMediaDispatch,
  useMediaSelector
} from 'media-chrome/react/media-store'

export default function useDoubleClickFullscreen() {
  const dispatch = useMediaDispatch()
  const mediaIsFullscreen = useMediaSelector((state) => {
    return state.mediaIsFullscreen
  })

  return (event: React.MouseEvent<HTMLVideoElement, MouseEvent>) => {
    if (event.detail === 2) {
      const type = mediaIsFullscreen
        ? MediaActionTypes.MEDIA_EXIT_FULLSCREEN_REQUEST
        : MediaActionTypes.MEDIA_ENTER_FULLSCREEN_REQUEST
      dispatch({ type })
    }
  }
}
