import { getRouteApi, Navigate } from '@tanstack/react-router'
import { VerifyEmailForm } from '~/components/User/verify-email-form'

const verifyEmailRouteApi = getRouteApi('/_public__root/_default/verify-email')

export const VerifyEmailPage = () => {
  const search = verifyEmailRouteApi.useSearch()

  if (!search.token) {
    return <Navigate to="/" />
  }

  return (
    <div className="flex justify-center">
      <div className="min-w-md border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-4 rounded-md border px-6 py-8 shadow-md">
        <VerifyEmailForm token={search.token} />
      </div>
    </div>
  )
}
