import { MemeStatus } from '~/db/generated/prisma/enums'

type ResolveAutosaveStatusParams = {
  savedStatus: MemeStatus
  selectedStatus: MemeStatus
}

export const resolveAutosaveStatus = ({
  savedStatus,
  selectedStatus
}: ResolveAutosaveStatusParams) => {
  const isGoingLive =
    selectedStatus === MemeStatus.PUBLISHED &&
    savedStatus !== MemeStatus.PUBLISHED

  return isGoingLive ? savedStatus : selectedStatus
}
