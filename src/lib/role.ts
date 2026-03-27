import type { auth } from '~/lib/auth'

export type SessionUser = (typeof auth)['$Infer']['Session']['user']

export const matchIsUserAdmin = (user: SessionUser) => {
  return user.role === 'admin'
}
