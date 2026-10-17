import { Ban } from 'lucide-react'
import { getRouteApi, Link, Navigate } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { CreateNewPasswordForm } from '~/components/User/create-new-password-form'
import { m } from '~/paraglide/messages.js'

const createNewPasswordRouteApi = getRouteApi(
  '/_public__root/_default/password/create-new'
)

export const CreateNewPasswordPage = () => {
  const search = createNewPasswordRouteApi.useSearch()

  if (search.error === 'INVALID_TOKEN') {
    return (
      <div className="max-w-lg mx-auto">
        <Alert variant="destructive">
          <Ban />
          <AlertTitle>{m.auth_invalid_link_title()}</AlertTitle>
          <AlertDescription>
            {m.auth_invalid_link_description()}
            <br />
            <br />
            <Link to="/password/reset" className="underline">
              {m.auth_request_new_link()}
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!search.token) {
    return <Navigate to="/" />
  }

  return (
    <div className="flex justify-center">
      <div className="min-w-md border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-4 rounded-md border px-6 py-8 shadow-md">
        <CreateNewPasswordForm token={search.token} />
      </div>
    </div>
  )
}
