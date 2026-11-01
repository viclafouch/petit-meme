import type { auth } from '~/lib/auth'

export type SessionUser = (typeof auth)['$Infer']['Session']['user']

export type UserRoleHolder = {
  role?: SessionUser['role'] | null
}

export const matchIsUserAdmin = (user: UserRoleHolder) => {
  return user.role === 'admin'
}

type MatchIsPremiumParams = {
  user: UserRoleHolder | null | undefined
  subscription: object | null | undefined
}

export const matchIsPremium = ({
  user,
  subscription
}: MatchIsPremiumParams) => {
  if (!user) {
    return false
  }

  return matchIsUserAdmin(user) || Boolean(subscription)
}
