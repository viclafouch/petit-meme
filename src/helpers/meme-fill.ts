import { MemeFillStatus } from '~/db/generated/prisma/enums'

export const matchIsFillInFlight = (status: MemeFillStatus) => {
  return status === MemeFillStatus.WAITING || status === MemeFillStatus.RUNNING
}
