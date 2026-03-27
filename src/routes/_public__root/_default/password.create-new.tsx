import { Ban } from 'lucide-react'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { CreateNewPasswordForm } from '~/components/User/create-new-password-form'
import { m } from '~/paraglide/messages.js'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'

const RouteComponent = () => {
  const search = Route.useSearch()

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

export const Route = createFileRoute(
  '/_public__root/_default/password/create-new'
)({
  validateSearch: (search) => {
    return z
      .object({
        // eslint-disable-next-line unicorn/no-useless-undefined
        token: z.string().optional().catch(undefined),
        // eslint-disable-next-line unicorn/no-useless-undefined
        error: z.literal('INVALID_TOKEN').optional().catch(undefined)
      })
      .parse(search)
  },
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        { title: m.auth_new_password_page_title() },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
