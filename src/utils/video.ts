import { BUNNY_STATUS } from '@/constants/bunny'

export const matchIsVideoPlayable = (bunnyStatus: number) => {
  return (
    bunnyStatus >= BUNNY_STATUS.RESOLUTION_FINISHED &&
    bunnyStatus !== BUNNY_STATUS.FAILED &&
    bunnyStatus !== BUNNY_STATUS.PRESIGNED_UPLOAD_FAILED
  )
}
