const DEFAULT_ASPECT_RATIO = '16 / 9'

type GetVideoAspectRatioParams = {
  width: number | null
  height: number | null
}

export const getVideoAspectRatio = ({
  width,
  height
}: GetVideoAspectRatioParams) => {
  if (width === null || height === null) {
    return DEFAULT_ASPECT_RATIO
  }

  return `${width} / ${height}`
}
