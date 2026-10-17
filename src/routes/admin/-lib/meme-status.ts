import { MemeStatus } from '~/db/generated/prisma/enums'

export const matchIsMemeStatus = (value: string): value is MemeStatus => {
  return Object.values<string>(MemeStatus).includes(value)
}
