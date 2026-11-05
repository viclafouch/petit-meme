import { MemeStatus } from '~/db/generated/prisma/enums'
import type { auth } from '~/lib/auth'

export type SessionUser = (typeof auth)['$Infer']['Session']['user']

export type UserRoleHolder = {
  role?: SessionUser['role'] | null
}

export const matchIsUserAdmin = (user: UserRoleHolder) => {
  return user.role === 'admin'
}

export type PremiumHolder = UserRoleHolder & {
  premiumGrantedAt?: SessionUser['premiumGrantedAt']
}

export const matchIsPremiumGranted = (user: PremiumHolder) => {
  return Boolean(user.premiumGrantedAt)
}

type MatchIsPremiumParams = {
  user: PremiumHolder | null | undefined
  subscription: object | null | undefined
}

export const matchIsPremium = ({
  user,
  subscription
}: MatchIsPremiumParams) => {
  if (!user) {
    return false
  }

  return (
    matchIsUserAdmin(user) ||
    matchIsPremiumGranted(user) ||
    Boolean(subscription)
  )
}

type MatchCanViewMemeParams = {
  user: UserRoleHolder | null | undefined
  status: MemeStatus
}

export const matchCanViewMeme = ({ user, status }: MatchCanViewMemeParams) => {
  if (status === MemeStatus.PUBLISHED) {
    return true
  }

  if (!user || status !== MemeStatus.PENDING) {
    return false
  }

  return matchIsUserAdmin(user)
}
